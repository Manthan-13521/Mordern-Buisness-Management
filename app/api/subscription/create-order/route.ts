import { NextResponse } from "next/server";
import { resolveUser, AuthUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";
import { User } from "@/models/User";
import { ReferralCode } from "@/models/ReferralCode";
import { getPriceKey, SUBSCRIPTION_PRICES, SubscriptionPlanType, SubscriptionModule } from "@/lib/subscriptionConfig";
import { razorpay, isRazorpayConfigured, razorpayDiagnostics } from "@/lib/razorpay";
import { createBreaker, getBreakerState } from "@/lib/circuitBreaker";
import { logger } from "@/lib/logger";

// ── Force Node.js runtime (Razorpay SDK uses Node APIs incompatible with Edge) ──
export const runtime = "nodejs";

// Circuit breaker for subscription Razorpay calls
const subscriptionBreaker = createBreaker(
    async (options: any) => razorpay!.orders.create(options),
    "razorpay-subscription-orders"
);

/**
 * POST /api/subscription/create-order
 * Body: { planType: "trial"|"quarterly"|"yearly"|"block-based", module: "pool"|"hostel", blocks?: 1-4 }
 */
export async function POST(req: Request) {
    const startTime = Date.now();
    try {
        const user = await resolveUser(req) as any;
        if (!user.id) {
            return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        const body = await req.json();
        const { planType, module, blocks, referralCode } = body as {
            planType: SubscriptionPlanType;
            module:   SubscriptionModule;
            blocks?:  number;
            referralCode?: string;
        };

        if (!planType || !module) {
            return NextResponse.json({ error: "planType and module are required" }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        // Validate module matches user user type
        const userModule: SubscriptionModule = user.hostelId ? "hostel" : "pool";
        if (module !== userModule) {
            return NextResponse.json({ error: "Module mismatch with your account type" }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        await dbConnect();
        const dbUser = await User.findById(user.id).lean() as any;
        if (!dbUser) return NextResponse.json({ error: "User not found" }, {  status: 404 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });

        // Trial guard
        if (planType === "trial" && dbUser.trial?.isUsed) {
            return NextResponse.json({ error: "Free trial already used. Please select a paid plan." }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        const priceKey = getPriceKey(planType, module, blocks);
        if (!priceKey) {
            return NextResponse.json({ error: "Invalid plan combination" }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        let amountINR   = SUBSCRIPTION_PRICES[priceKey];

        // Apply Referral Discount if provided
        if (referralCode && planType !== "trial") {
            const codeDoc = await ReferralCode.findOne({
                code: referralCode.toUpperCase().trim(),
                isActive: true
            });

            if (codeDoc && (!codeDoc.expiresAt || new Date(codeDoc.expiresAt) > new Date()) && (codeDoc.maxUses === 0 || codeDoc.usedCount < codeDoc.maxUses)) {
                let discount = 0;
                if (codeDoc.discountType === "percentage") {
                    discount = (amountINR * codeDoc.discountValue) / 100;
                } else if (codeDoc.discountType === "flat") {
                    discount = codeDoc.discountValue;
                }
                amountINR -= discount;
                if (amountINR <= 0) amountINR = 1; // Minimum charge
                amountINR = Math.floor(amountINR);
            }
        }

        const amountPaise = amountINR * 100;

        // ── Pre-flight diagnostics ───────────────────────────────────────────
        logger.info("[Subscription] Create-order pre-flight", {
            razorpayConfigured:  isRazorpayConfigured,
            sdkInitSuccess:      razorpayDiagnostics.initSuccess,
            sdkInitError:        razorpayDiagnostics.initError,
            keyPrefix:           razorpayDiagnostics.keyPrefix,
            isTestMode:          razorpayDiagnostics.isTestMode,
            keysMatch:           razorpayDiagnostics.keysMatch,
            breakerState:        getBreakerState(subscriptionBreaker),
            planType, module, amountPaise,
        }, "payment");

        // Mock mode — no keys configured
        if (!isRazorpayConfigured) {
            logger.warn("[Subscription] Running in MOCK mode — no Razorpay keys configured");
            return NextResponse.json({
                orderId:  `order_mock_${Date.now()}`,
                amount:   amountPaise,
                currency: "INR",
                isMock:   true,
                planType,
                module,
                blocks,
                amountINR,
                referralCode,
            }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        // ── SDK init failed — return specific error, don't hit breaker ───────
        if (!razorpay || !razorpayDiagnostics.initSuccess) {
            const errMsg = razorpayDiagnostics.initError || "Razorpay SDK failed to initialize";
            logger.error("[Subscription] SDK not available", { initError: errMsg });
            return NextResponse.json({
                error: "Payment gateway configuration error",
                ...(process.env.NODE_ENV !== "production" ? { debug: { initError: errMsg, diagnostics: razorpayDiagnostics } } : {}),
            }, { status: 503, headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        // ── Payload validation ───────────────────────────────────────────────
        if (!Number.isInteger(amountPaise) || amountPaise < 100) {
            return NextResponse.json({ error: "Invalid payment amount" }, { status: 400, headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        const orderPayload = {
            amount:   amountPaise,
            currency: "INR",
            receipt:  `sub_${user.id}_${planType}_${Date.now()}`,
            notes: {
                userId:  user.id,
                planType,
                module,
                blocks:  blocks?.toString() || "",
                referralCode: referralCode || "",
            },
        };

        // ── Emergency debug mode: bypass circuit breaker ─────────────────────
        // Set RAZORPAY_DEBUG_BYPASS=true in env to bypass the circuit breaker entirely
        // and call Razorpay directly for debugging. Remove after fixing.
        let order: any;
        if (process.env.RAZORPAY_DEBUG_BYPASS === "true") {
            logger.warn("[Subscription] ⚠️ DEBUG BYPASS — calling Razorpay directly without circuit breaker");
            try {
                order = await razorpay.orders.create(orderPayload);
                logger.info("[Subscription] ✅ Direct Razorpay call succeeded", { orderId: order.id });
            } catch (directErr: any) {
                logger.error("[Subscription] ❌ Direct Razorpay call FAILED", {
                    statusCode: directErr?.statusCode,
                    error: directErr?.error,
                    description: directErr?.description || directErr?.message,
                    rawError: process.env.NODE_ENV !== "production" ? JSON.stringify(directErr, null, 2) : undefined,
                });
                return NextResponse.json({
                    error: "Razorpay API call failed",
                    ...(process.env.NODE_ENV !== "production" ? {
                        debug: {
                            statusCode: directErr?.statusCode,
                            razorpayError: directErr?.error,
                            description: directErr?.description || directErr?.message,
                        }
                    } : {}),
                }, { status: directErr?.statusCode || 500, headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
            }
        } else {
            // Normal path: circuit breaker protected
            order = await subscriptionBreaker.fire(orderPayload) as any;
        }

        const elapsed = Date.now() - startTime;
        logger.info("[Subscription] ✅ Order created successfully", {
            orderId: order.id, elapsed: `${elapsed}ms`,
        }, "payment");

        return NextResponse.json({
            orderId:  order.id,
            amount:   amountPaise,
            currency: "INR",
            isMock:   false,
            planType,
            module,
            blocks,
            amountINR,
            referralCode,
        }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    } catch (error: any) {
        const elapsed = Date.now() - startTime;

        // ── Classify the error ───────────────────────────────────────────────
        const statusCode = error?.statusCode || error?.status;
        const isBreaker  = error?.code === "EOPENBREAKER" || error?.message?.includes("Breaker is open");
        const isTimeout  = error?.code === "ETIMEDOUT" || error?.message?.includes("Timed out");

        // Structured error logging
        logger.error("[Subscription] ❌ Order creation failed", {
            elapsed:     `${elapsed}ms`,
            isBreaker,
            isTimeout,
            statusCode,
            errorCode:   error?.error?.code || error?.code,
            description: error?.error?.description || error?.description || error?.message,
            breakerState: getBreakerState(subscriptionBreaker),
        });

        // ── Circuit breaker is open ──────────────────────────────────────────
        if (isBreaker) {
            return NextResponse.json({
                error: "Payment service temporarily unavailable. The system will retry automatically in 30 seconds.",
                code:  "CIRCUIT_BREAKER_OPEN",
                ...(process.env.NODE_ENV !== "production" ? { debug: { breakerState: "OPEN", resetIn: "30s" } } : {}),
            }, { status: 503, headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        // ── Razorpay API error (4xx) ─────────────────────────────────────────
        if (statusCode && statusCode >= 400 && statusCode < 500) {
            return NextResponse.json({
                error: "Payment gateway rejected the request",
                code:  "RAZORPAY_CLIENT_ERROR",
                ...(process.env.NODE_ENV !== "production" ? {
                    debug: {
                        statusCode,
                        razorpayError: error?.error?.code || error?.code,
                        description:   error?.error?.description || error?.description || error?.message,
                    }
                } : {}),
            }, { status: 502, headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        // ── Timeout ──────────────────────────────────────────────────────────
        if (isTimeout) {
            return NextResponse.json({
                error: "Payment gateway timed out. Please try again.",
                code:  "RAZORPAY_TIMEOUT",
            }, { status: 504, headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        // ── Generic error ────────────────────────────────────────────────────
        return NextResponse.json({
            error: "Failed to create subscription order",
            code:  "INTERNAL_ERROR",
            ...(process.env.NODE_ENV !== "production" ? { debug: { message: error?.message } } : {}),
        }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}
