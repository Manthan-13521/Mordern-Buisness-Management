import { dbConnect } from "@/lib/mongodb";
import { User } from "@/models/User";
import { SubscriptionPaymentLog } from "@/models/SubscriptionPaymentLog";
import { ReferralCode } from "@/models/ReferralCode";
import { ReferralUsage } from "@/models/ReferralUsage";
import { Organization } from "@/models/Organization";
import { getPriceKey, SUBSCRIPTION_PRICES, SubscriptionPlanType, SubscriptionModule } from "@/lib/subscriptionConfig";
import { redis } from "@/lib/redis";
import crypto from "crypto";
import { logger } from "@/lib/logger";

/**
 * Compute expiry date from planType.
 * Renewal-aware: base = MAX(currentExpiry, now) so active users extend forward.
 */
function computeExpiryDate(planType: SubscriptionPlanType, currentExpiry?: Date): Date {
    const base = new Date(Math.max(currentExpiry?.getTime() ?? 0, Date.now()));
    if (planType === "trial") {
        return new Date(base.getTime() + 7 * 24 * 60 * 60 * 1000);
    }
    const d = new Date(base);
    if (planType === "quarterly") {
        d.setMonth(d.getMonth() + 3);
    } else {
        // yearly or block-based → 12 months
        d.setMonth(d.getMonth() + 12);
    }
    return d;
}

/**
 * Core activation logic — shared by both webhook (primary) and frontend-fallback routes.
 */
export async function activateSubscription(params: {
    razorpayOrderId:    string;
    razorpayPaymentId:  string;
    razorpaySignature:  string;
    isMock:             boolean;
    userId:             string;
    planType:           SubscriptionPlanType;
    module:             SubscriptionModule;
    blocks?:            number;
    referralCode?:      string;
}): Promise<{ user: any; amountINR: number; expiryDate: Date }> {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, isMock, userId, planType, module, blocks, referralCode } = params;

    // 1. Verify Razorpay signature — skip only in mock mode
    if (!isMock && razorpaySignature) {
        const secret = process.env.RAZORPAY_KEY_SECRET;
        if (!secret) throw new Error("Missing RAZORPAY_KEY_SECRET");

        const expectedSig = crypto
            .createHmac("sha256", secret)
            .update(`${razorpayOrderId}|${razorpayPaymentId}`)
            .digest("hex");

        if (expectedSig !== razorpaySignature) {
            logger.audit({
                type:   "SUBSCRIPTION_PAYMENT_FAILED",
                userId,
                meta:   { reason: "signature_mismatch", razorpayOrderId },
            });
            throw new Error("Payment signature verification failed");
        }
    }

    await dbConnect();

    // 2. Idempotency: if this order was already processed successfully, return early
    const existing = await SubscriptionPaymentLog.findOne({
        razorpayOrderId,
        status: "success",
    }).lean() as any;

    if (existing) {
        const user = await User.findById(userId).lean();
        return {
            user,
            amountINR:  existing.amount as number,
            expiryDate: (user as any)?.subscription?.expiryDate ?? new Date(),
        };
    }

    // 3. Validate plan
    const priceKey = getPriceKey(planType, module, blocks);
    if (!priceKey) throw new Error("Invalid plan combination");
    let amountINR = SUBSCRIPTION_PRICES[priceKey];

    let appliedDiscount = 0;
    
    // Apply referral code if present
    if (referralCode && planType !== "trial") {
        const codeDoc = await ReferralCode.findOne({
            code: referralCode.toUpperCase().trim(),
            isActive: true
        });

        if (codeDoc && (!codeDoc.expiresAt || new Date(codeDoc.expiresAt) > new Date()) && (codeDoc.maxUses === 0 || codeDoc.usedCount < codeDoc.maxUses)) {
            if (codeDoc.discountType === "percentage") {
                appliedDiscount = (amountINR * codeDoc.discountValue) / 100;
            } else {
                appliedDiscount = codeDoc.discountValue;
            }
            amountINR -= appliedDiscount;
            if (amountINR <= 0) amountINR = 1;
            amountINR = Math.floor(amountINR);

            // Commit usage
            codeDoc.usedCount += 1;
            await codeDoc.save();

            // Create Usage Record
            await ReferralUsage.create({
                code: codeDoc.code,
                orgId: userId, // Mapping to user's _id as org root for SaaS plans
                discountApplied: appliedDiscount
            });
        }
    }

    // 4. Load user
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");

    // Trial guard — double-check server-side
    if (planType === "trial" && user.trial?.isUsed) {
        throw new Error("Free trial already used");
    }

    // 5. Compute new expiry (renewal-aware)
    const currentExpiry = user.subscription?.expiryDate;
    const expiryDate = computeExpiryDate(planType, currentExpiry);
    const now = new Date();

    // 6. Write unified subscription sub-doc
    (user as any).subscription = {
        module,
        planType,
        blocks,
        pricePaid: amountINR,
        startDate: now,
        expiryDate,
        status: planType === "trial" ? "trial" : "active",
    };

    if (planType === "trial") {
        user.trial = { isUsed: true };
    }

    await user.save();

    // 7. Record payment log
    await SubscriptionPaymentLog.create({
        userId:            user._id,
        poolId:            user.poolId,
        hostelId:          user.hostelId,
        module,
        planType,
        blocks,
        amount:            amountINR,
        razorpayOrderId,
        razorpayPaymentId,
        status:            "success",
    });

    logger.audit({
        type:   "SUBSCRIPTION_ACTIVATED",
        userId,
        meta:   { planType, module, blocks, amountINR, expiryDate, razorpayPaymentId },
    });

    // 8. Sync Organization model (if exists) — keeps saasGuard.ts in sync
    try {
        const org = await Organization.findOne({ ownerId: user._id });
        if (org) {
            org.status = planType === "trial" ? "trial" : "active";
            org.currentPeriodEnd = expiryDate;
            if (planType === "trial") {
                org.trialEndsAt = expiryDate;
            }
            await org.save();

            // Invalidate Redis SaaS guard cache so it picks up new state immediately
            if (redis) {
                try {
                    await redis.del(`org:${org._id.toString()}:plan`);
                    logger.info("[Activation] Redis saasGuard cache invalidated", { orgId: org._id.toString() });
                } catch (e) {
                    // Non-fatal — cache will expire naturally
                    logger.warn("[Activation] Redis cache invalidation failed", { error: (e as Error).message });
                }
            }

            logger.info("[Activation] Organization synced", {
                orgId: org._id.toString(),
                status: org.status,
                currentPeriodEnd: expiryDate,
            });
        }
    } catch (orgErr: any) {
        // Non-fatal — Organization sync is best-effort
        logger.warn("[Activation] Organization sync failed (non-fatal)", { error: orgErr?.message });
    }

    return { user: user.toObject(), amountINR, expiryDate };
}
