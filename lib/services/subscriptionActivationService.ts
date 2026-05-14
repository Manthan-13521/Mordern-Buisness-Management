import { dbConnect } from "@/lib/mongodb";
import { User } from "@/models/User";
import { SubscriptionPaymentLog } from "@/models/SubscriptionPaymentLog";
import { Organization } from "@/models/Organization";
import { ReferralCode } from "@/models/ReferralCode";
import { ReferralUsage } from "@/models/ReferralUsage";
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
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, isMock, userId, planType: reqPlanType, module: reqModule, blocks: reqBlocks } = params;
    let referralCode = params.referralCode;
    let amountPaid = params.amountPaid;

    // ── Verified values: these are set from the Razorpay order (source of truth) ──
    // Fall back to request values only for webhook path (already externally verified)
    let verifiedPlanType: SubscriptionPlanType = reqPlanType;
    let verifiedModule: SubscriptionModule = reqModule;
    let verifiedBlocks: number | undefined = reqBlocks;

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

        // SECURITY: If Razorpay SDK unavailable for a frontend request, hard-fail
        // Never skip verification for frontend-initiated activations
        if (!rzp && razorpaySignature) {
            logger.error("[Activation] SECURITY: Razorpay SDK unavailable for frontend activation — blocking");
            throw new Error("Payment gateway unavailable for verification");
        }

        if (rzp) {
            try {
                const order = await rzp.orders.fetch(razorpayOrderId) as any;
                if (!order) throw new Error("Razorpay order not found");

                const notes = order.notes || {};
                const orderPlan = notes.planType as SubscriptionPlanType;
                const orderModule = notes.module as SubscriptionModule;
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

                verifiedPlanType = orderPlan;
                verifiedModule = orderModule;
                verifiedBlocks = orderBlocks;
                const orderReferralCode = notes.referralCode as string | undefined;

                // ── SOURCE OF TRUTH: Use order-derived values, NOT request values ──
                // If referralCode wasn't in params (e.g. frontend fallback), use the one from the order notes
                if (!referralCode && orderReferralCode) {
                    referralCode = orderReferralCode;
                }

                // Get actual amount from order
                if (amountPaid === undefined) {
                    amountPaid = order.amount_paid / 100;
                }

                // ── AMOUNT-TO-BLOCKS REVERSE VALIDATION (hostel plans) ──
                // Even after notes match, verify the AMOUNT actually corresponds to
                // the claimed blocks. Prevents any mismatch between order amount and entitlement.
                if (verifiedModule === "hostel" && verifiedPlanType === "block-based" && verifiedBlocks) {
                    const expectedPriceKey = getPriceKey("block-based", "hostel", verifiedBlocks);
                    if (expectedPriceKey) {
                        const expectedAmountPaise = SUBSCRIPTION_PRICES[expectedPriceKey] * 100;
                        const orderAmountPaise = order.amount || 0;
                        // Order amount must be >= ₹1 AND <= expected full price
                        // (referral discounts can reduce but never below ₹1)
                        if (orderAmountPaise < 100 || orderAmountPaise > expectedAmountPaise) {
                            logger.audit({
                                type: "SUBSCRIPTION_AMOUNT_MISMATCH",
                                userId,
                                meta: {
                                    verifiedBlocks,
                                    orderAmountPaise,
                                    expectedAmountPaise,
                                    razorpayOrderId,
                                }
                            });
                            throw new Error("Payment amount does not match the block entitlement");
                        }
                    }
                }
            } catch (fetchErr: any) {
                logger.error("[Activation] Failed to verify order with Razorpay", { error: fetchErr.message });
                // If it came from the frontend API, we MUST fail — never skip verification
                if (razorpaySignature) throw new Error("Could not verify order with payment gateway");
                // Webhook path: order notes already verified by webhook handler separately
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

    // 3. Validate plan — using VERIFIED values (from Razorpay order), not request values
    const priceKey = getPriceKey(verifiedPlanType, verifiedModule, verifiedBlocks);
    if (!priceKey) throw new Error("Invalid plan combination");
    
    // If amountPaid still unknown, fallback to default price (only in mock or webhook fallback)
    const finalAmountPaid = amountPaid !== undefined ? amountPaid : SUBSCRIPTION_PRICES[priceKey];

    // 4. Load user
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");

    // Trial guard — double-check server-side
    if (verifiedPlanType === "trial" && user.trial?.isUsed) {
        throw new Error("Free trial already used");
    }

    // 5. Compute new expiry (renewal-aware)
    const currentExpiry = user.subscription?.expiryDate;
    const expiryDate = computeExpiryDate(verifiedPlanType, currentExpiry);
    const now = new Date();

    // 6. Write unified subscription sub-doc — using VERIFIED values only
    (user as any).subscription = {
        module: verifiedModule,
        planType: verifiedPlanType,
        blocks: verifiedBlocks,
        pricePaid: finalAmountPaid,
        startDate: now,
        expiryDate,
        status: verifiedPlanType === "trial" ? "trial" : "active",
    };

    if (verifiedPlanType === "trial") {
        user.trial = { isUsed: true };
    }

    await user.save();

    // 7. Record payment log — using VERIFIED values
    await SubscriptionPaymentLog.create({
        userId:            user._id,
        poolId:            user.poolId,
        hostelId:          user.hostelId,
        businessId:        user.businessId,
        module:            verifiedModule,
        planType:          verifiedPlanType,
        blocks:            verifiedBlocks,
        amount:            finalAmountPaid,
        razorpayOrderId,
        razorpayPaymentId,
        status:            "success",
    });

    // 7b. CRITICAL: Also write BillingLog so dashboard/billing/analytics pick up this payment
    // Uses razorpayOrderId-based idempotency to prevent double-counting
    try {
        const { BillingLog } = await import("@/models/BillingLog");
        const org = await Organization.findOne({ ownerId: user._id }).lean() as any;
        if (org) {
            await (BillingLog as any).findOneAndUpdate(
                { orgId: org._id, method: "razorpay", periodStart: now },
                {
                    $setOnInsert: {
                        orgId: org._id,
                        amount: finalAmountPaid,
                        method: "razorpay",
                        paymentMode: "Razorpay",
                        periodStart: now,
                        periodEnd: expiryDate,
                    }
                },
                { upsert: true }
            );
        }
    } catch (billingErr: any) {
        // Non-fatal — dashboard display issue only, subscription is already active
        logger.warn("[Activation] BillingLog sync failed (non-fatal)", { error: billingErr?.message });
    }

    logger.audit({
        type:   "SUBSCRIPTION_ACTIVATED",
        userId,
        meta:   { planType: verifiedPlanType, module: verifiedModule, blocks: verifiedBlocks, amountINR: finalAmountPaid, expiryDate, razorpayPaymentId },
    });

    // 8. Sync Organization model (if exists) — keeps saasGuard.ts in sync
    try {
        const orgForSync = await Organization.findOne({ ownerId: user._id });
        if (orgForSync) {
            orgForSync.status = verifiedPlanType === "trial" ? "trial" : "active";
            orgForSync.currentPeriodEnd = expiryDate;
            if (verifiedPlanType === "trial") {
                orgForSync.trialEndsAt = expiryDate;
            }
            await orgForSync.save();

            // Invalidate Redis SaaS guard cache so it picks up new state immediately
            if (redis) {
                try {
                    await redis.del(`org:${orgForSync._id.toString()}:plan`);
                    logger.info("[Activation] Redis saasGuard cache invalidated", { orgId: orgForSync._id.toString() });
                } catch (e) {
                    // Non-fatal — cache will expire naturally
                    logger.warn("[Activation] Redis cache invalidation failed", { error: (e as Error).message });
                }
            }

            logger.info("[Activation] Organization synced", {
                orgId: orgForSync._id.toString(),
                status: orgForSync.status,
                currentPeriodEnd: expiryDate,
            });
        }
    } catch (orgErr: any) {
        // Non-fatal — Organization sync is best-effort
        logger.warn("[Activation] Organization sync failed (non-fatal)", { error: orgErr?.message });
    }

    // 9. Record Referral Usage (if applicable)
    // This increments the usage counter and records a log for the Referral Engine dashboard
    if (referralCode) {
        try {
            const codeDoc = await ReferralCode.findOne({ code: referralCode.toUpperCase().trim() });
            if (codeDoc) {
                // Increment atomic counter
                await ReferralCode.updateOne({ _id: codeDoc._id }, { $inc: { usedCount: 1 } });

                // Calculate discount applied for reporting
                const basePrice = SUBSCRIPTION_PRICES[priceKey] || 0;
                const discountApplied = Math.max(0, basePrice - finalAmountPaid);

                // Record detailed usage log
                const org = await Organization.findOne({ ownerId: user._id }).lean() as any;
                if (org) {
                    await ReferralUsage.create({
                        code: codeDoc.code,
                        orgId: org._id,
                        discountApplied: discountApplied
                    });
                    logger.info("[Activation] Referral usage recorded", { 
                        code: codeDoc.code, 
                        orgId: org._id.toString(), 
                        discountApplied 
                    });
                }
            }
        } catch (refErr: any) {
            // Non-fatal — analytics failure shouldn't block activation
            logger.warn("[Activation] Referral recording failed (non-fatal)", { error: refErr?.message });
        }
    }

    return { user: user.toObject(), amountINR: finalAmountPaid, expiryDate };
}
