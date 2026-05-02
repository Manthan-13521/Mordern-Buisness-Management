import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { dbConnect } from "@/lib/mongodb";
import { Plan } from "@/models/Plan";
import { RazorpayOrderSchema } from "@/lib/validators";

// Initialize Razorpay instance conditionally
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_mock",
    key_secret: process.env.RAZORPAY_KEY_SECRET || "mock_secret",
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const result = RazorpayOrderSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json({ error: Object.entries(result.error.flatten().fieldErrors).map(([f, m]) => `${f}: ${(m as string[])?.join(", ")}`).join(" | ") || "Validation failed" }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }
        const { planId, cartQuantity } = result.data;

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

        const orderOptions = {
            amount,
            currency: "INR",
            receipt: `receipt_rcpt_${Date.now()}`,
        };

        const order = await razorpay.orders.create(orderOptions);

        return NextResponse.json(order, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    } catch (error) {
        console.error("Razorpay Order Creation Error:", error);
        return NextResponse.json({ error: "Failed to create payment order" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}
