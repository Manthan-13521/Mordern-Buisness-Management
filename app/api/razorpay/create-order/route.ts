import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { dbConnect } from "@/lib/mongodb";
import { Plan } from "@/models/Plan";
import { Payment } from "@/models/Payment";
import { RazorpayOrderSchema } from "@/lib/validators";
import { createBreaker } from "@/lib/circuitBreaker";

// Initialize Razorpay instance conditionally
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_mock",
    key_secret: process.env.RAZORPAY_KEY_SECRET || "mock_secret",
});

// Circuit breaker for Razorpay API calls — fails fast if Razorpay is down
const razorpayBreaker = createBreaker(
    async (options: any) => razorpay.orders.create(options),
    "razorpay-orders"
);

export async function POST(req: Request) {
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

        // Optional Check: Is this a mock Razorpay run?
        if (!process.env.RAZORPAY_KEY_ID) {
            // Simulate Order Creation for Dev/Test mode without actual keys
            return NextResponse.json({
                id: `order_mock_${Date.now()}`,
                amount,
                currency: "INR",
                isMock: true,
            }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
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

        return NextResponse.json(order, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    } catch (error: any) {
        // Circuit breaker tripped
        if (error?.message?.includes("Tripped Breaker")) {
            return NextResponse.json({ error: "Payment service temporarily unavailable. Please try again shortly." }, { status: 503, headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }
        console.error("Razorpay Order Creation Error:", error);
        return NextResponse.json({ error: "Failed to create payment order" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}
