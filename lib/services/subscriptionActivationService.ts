import { dbConnect } from "@/lib/mongodb";
import { User } from "@/models/User";
import { SubscriptionPaymentLog } from "@/models/SubscriptionPaymentLog";
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
    amountPaid?:        number; // Actual amount from Razorpay
}): Promise<{ user: any; amountINR: number; expiryDate: Date }> {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, isMock, userId, planType: reqPlanType, module: reqModule, blocks: reqBlocks, referralCode } = params;
    let amountPaid = params.amountPaid;

    // 1. Verify Razorpay Order & Signature — skip only in mock mode
    if (!isMock) {
        const secret = process.env.RAZORPAY_KEY_SECRET;
        if (!secret) throw new Error("Missing RAZORPAY_KEY_SECRET");

        // Verify Signature if provided (from frontend callback)
        if (razorpaySignature) {
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

        // ── CRITICAL: Fetch order from Razorpay to verify details ──────────
        // This prevents users from tampering with the activate request to get a better plan
        const { razorpay: rzp } = await import("@/lib/razorpay");
        if (rzp) {
            try {
                const order = await rzp.orders.fetch(razorpayOrderId) as any;
                if (!order) throw new Error("Razorpay order not found");

                const notes = order.notes || {};
                const orderPlan = notes.planType;
                const orderModule = notes.module;
                const orderBlocks = notes.blocks ? parseInt(notes.blocks) : undefined;
                
                // Verify that the requested plan matches what was actually ordered
                if (orderPlan !== reqPlanType || orderModule !== reqModule || orderBlocks !== reqBlocks) {
                    logger.audit({
                        type: "SUBSCRIPTION_ACTIVATION_TAMPERED",
                        userId,
                        meta: { 
                            requested: { plan: reqPlanType, module: reqModule, blocks: reqBlocks },
                            ordered: { plan: orderPlan, module: orderModule, blocks: orderBlocks }
                        }
                    });
                    throw new Error("Requested plan does not match the order");
                }

                // Get actual amount from order if not provided
                if (amountPaid === undefined) {
                    amountPaid = order.amount_paid / 100;
                }
            } catch (fetchErr: any) {
                logger.error("[Activation] Failed to verify order with Razorpay", { error: fetchErr.message });
                // If fetching order fails, we fallback to trusting the params IF it came from the webhook (which is already verified)
                // If it came from the frontend API, we must fail.
                if (razorpaySignature) throw new Error("Could not verify order with payment gateway");
            }
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
    const priceKey = getPriceKey(reqPlanType, reqModule, reqBlocks);
    if (!priceKey) throw new Error("Invalid plan combination");
    
    // If amountPaid still unknown, fallback to default price (only in mock or webhook fallback)
    const finalAmountPaid = amountPaid !== undefined ? amountPaid : SUBSCRIPTION_PRICES[priceKey];

    // 4. Load user
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");

    // Trial guard — double-check server-side
    if (reqPlanType === "trial" && user.trial?.isUsed) {
        throw new Error("Free trial already used");
    }

    // 5. Compute new expiry (renewal-aware)
    const currentExpiry = user.subscription?.expiryDate;
    const expiryDate = computeExpiryDate(reqPlanType, currentExpiry);
    const now = new Date();

    // 6. Write unified subscription sub-doc
    (user as any).subscription = {
        module: reqModule,
        planType: reqPlanType,
        blocks: reqBlocks,
        pricePaid: finalAmountPaid,
        startDate: now,
        expiryDate,
        status: reqPlanType === "trial" ? "trial" : "active",
    };

    if (reqPlanType === "trial") {
        user.trial = { isUsed: true };
    }

    await user.save();

    // 7. Record payment log
    await SubscriptionPaymentLog.create({
        userId:            user._id,
        poolId:            user.poolId,
        hostelId:          user.hostelId,
        businessId:        user.businessId,
        module:            reqModule,
        planType:          reqPlanType,
        blocks:            reqBlocks,
        amount:            finalAmountPaid,
        razorpayOrderId,
        razorpayPaymentId,
        status:            "success",
    });

    logger.audit({
        type:   "SUBSCRIPTION_ACTIVATED",
        userId,
        meta:   { planType: reqPlanType, module: reqModule, blocks: reqBlocks, amountINR: finalAmountPaid, expiryDate, razorpayPaymentId },
    });

    // 8. Sync Organization model (if exists) — keeps saasGuard.ts in sync
    try {
        const org = await Organization.findOne({ ownerId: user._id });
        if (org) {
            org.status = reqPlanType === "trial" ? "trial" : "active";
            org.currentPeriodEnd = expiryDate;
            if (reqPlanType === "trial") {
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

    return { user: user.toObject(), amountINR: finalAmountPaid, expiryDate };
}
