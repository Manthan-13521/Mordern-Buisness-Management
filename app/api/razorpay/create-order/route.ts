import { NextResponse } from "next/server";
import { razorpay, isRazorpayConfigured, razorpayDiagnostics } from "@/lib/razorpay";
import { dbConnect } from "@/lib/mongodb";
import { Plan } from "@/models/Plan";
import { Payment } from "@/models/Payment";
import { RazorpayOrderSchema } from "@/lib/validators";
import { createBreaker, getBreakerState } from "@/lib/circuitBreaker";
import { logger } from "@/lib/logger";

// ── Force Node.js runtime (Razorpay SDK uses Node APIs incompatible with Edge) ──
export const runtime = "nodejs";

// Circuit breaker for Razorpay API calls — fails fast if Razorpay is down
const razorpayBreaker = createBreaker(
    async (options: any) => razorpay!.orders.create(options),
    "razorpay-orders"
);

export async function POST(req: Request) {
    const startTime = Date.now();
    try {
        const body = await req.json();
        const result = RazorpayOrderSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json({ error: Object.entries(result.error.flatten().fieldErrors).map(([f, m]) => `${f}: ${(m as string[])?.join(", ")}`).join(" | ") || "Validation failed" }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }
        const { planId, cartQuantity, memberId: reqMemberId } = result.data;

        await dbConnect();
        const plan = await Plan.findById(planId);

        if (!plan) {
            return NextResponse.json({ error: "Invalid plan selected" }, {  status: 404 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        // Amount should be in smaller units (paise)
        const amount = plan.price * cartQuantity * 100;

        // ── Pre-flight diagnostics ───────────────────────────────────────────
        logger.info("[Razorpay] Create-order pre-flight", {
            razorpayConfigured:  isRazorpayConfigured,
            sdkInitSuccess:      razorpayDiagnostics.initSuccess,
            sdkInitError:        razorpayDiagnostics.initError,
            keyPrefix:           razorpayDiagnostics.keyPrefix,
            breakerState:        getBreakerState(razorpayBreaker),
            amount, planId,
        }, "payment");

        // Optional Check: Is this a mock Razorpay run?
        if (!isRazorpayConfigured) {
            // Simulate Order Creation for Dev/Test mode without actual keys
            return NextResponse.json({
                id: `order_mock_${Date.now()}`,
                amount,
                currency: "INR",
                isMock: true,
            }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        // ── SDK init failed — return specific error, don't hit breaker ───────
        if (!razorpay || !razorpayDiagnostics.initSuccess) {
            const errMsg = razorpayDiagnostics.initError || "Razorpay SDK failed to initialize";
            logger.error("[Razorpay] SDK not available for pool order", { initError: errMsg });
            return NextResponse.json({
                error: "Payment gateway configuration error",
                ...(process.env.NODE_ENV !== "production" ? { debug: { initError: errMsg, diagnostics: razorpayDiagnostics } } : {}),
            }, { status: 503, headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        // ── Idempotency: month-level window ──
        // Format: rzp_${poolId}_${memberId}_${planId}_${YYYY-MM}
        // Month window prevents duplicate orders within a billing cycle
        // Never include hours or minutes — that defeats the purpose of dedup
        const now = new Date();
        const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const memberKey = reqMemberId || "new"; // "new" for first-time registrations
        const idempotencyKey = `rzp_${plan.poolId}_${memberKey}_${planId}_${monthKey}`;

        // Check for existing order with this idempotency key before calling Razorpay
        const existingPayment = await Payment.findOne({
            idempotencyKey,
            razorpayOrderId: { $exists: true, $ne: null },
            status: { $in: ["pending", "success"] },
        }).select("razorpayOrderId amount status").lean();

        if (existingPayment) {
            // Return existing order — prevents double-charge on network timeout retry
            return NextResponse.json({
                id: (existingPayment as any).razorpayOrderId,
                amount,
                currency: "INR",
                idempotent: true,
            }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        const orderOptions = {
            amount,
            currency: "INR",
            receipt: idempotencyKey,
            notes: { idempotencyKey, poolId: plan.poolId, memberId: memberKey },
        };

        // Circuit breaker: fails fast (rejects immediately) if Razorpay is down
        const order = await razorpayBreaker.fire(orderOptions);

        // Persist the Razorpay order ID + idempotency key for future lookups
        // This is a lightweight "pending" record — full payment record created on webhook confirmation
        try {
            await Payment.findOneAndUpdate(
                { idempotencyKey },
                {
                    $setOnInsert: {
                        razorpayOrderId: (order as any).id,
                        idempotencyKey,
                        amount: plan.price * cartQuantity,
                        planId,
                        status: "pending",
                        paymentMethod: "razorpay_online",
                        poolId: plan.poolId,
                        memberId: reqMemberId || "000000000000000000000000", // placeholder for new registrations
                        date: now,
                    }
                },
                { upsert: true, new: true }
            );
        } catch (persistErr: any) {
            // Duplicate key = already persisted from a concurrent request — safe to ignore
            if (persistErr?.code !== 11000) {
                console.error("Failed to persist Razorpay order:", persistErr);
            }
        }

        const elapsed = Date.now() - startTime;
        logger.info("[Razorpay] ✅ Pool order created", { orderId: (order as any).id, elapsed: `${elapsed}ms` }, "payment");

        return NextResponse.json(order, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    } catch (error: any) {
        const elapsed = Date.now() - startTime;
        const statusCode = error?.statusCode || error?.status;
        const isBreaker  = error?.code === "EOPENBREAKER" || error?.message?.includes("Breaker is open");

        logger.error("[Razorpay] ❌ Pool order creation failed", {
            elapsed: `${elapsed}ms`,
            isBreaker,
            statusCode,
            description: error?.error?.description || error?.description || error?.message,
            breakerState: getBreakerState(razorpayBreaker),
        });

        // Circuit breaker tripped
        if (isBreaker) {
            return NextResponse.json({
                error: "Payment service temporarily unavailable. Please try again shortly.",
                code:  "CIRCUIT_BREAKER_OPEN",
            }, { status: 503, headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        // Razorpay 4xx
        if (statusCode && statusCode >= 400 && statusCode < 500) {
            return NextResponse.json({
                error: "Payment gateway rejected the request",
                ...(process.env.NODE_ENV !== "production" ? {
                    debug: { statusCode, description: error?.error?.description || error?.message }
                } : {}),
            }, { status: 502, headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        return NextResponse.json({
            error: "Failed to create payment order",
            ...(process.env.NODE_ENV !== "production" ? { debug: { message: error?.message } } : {}),
        }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}
