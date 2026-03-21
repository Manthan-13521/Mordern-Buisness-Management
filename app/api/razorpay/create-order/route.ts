import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { dbConnect } from "@/lib/mongodb";
import { Plan } from "@/models/Plan";

// Initialize Razorpay instance conditionally
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_mock",
    key_secret: process.env.RAZORPAY_KEY_SECRET || "mock_secret",
});

export async function POST(req: Request) {
    try {
        const { planId, cartQuantity = 1 } = await req.json();

        if (!planId) {
            return NextResponse.json({ error: "Plan ID is required" }, { status: 400 });
        }

        await dbConnect();
        const plan = await Plan.findById(planId);

        if (!plan) {
            return NextResponse.json({ error: "Invalid plan selected" }, { status: 404 });
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
            });
        }

        const orderOptions = {
            amount,
            currency: "INR",
            receipt: `receipt_rcpt_${Date.now()}`,
        };

        const order = await razorpay.orders.create(orderOptions);

        return NextResponse.json(order);
    } catch (error) {
        console.error("Razorpay Order Creation Error:", error);
        return NextResponse.json({ error: "Failed to create payment order" }, { status: 500 });
    }
}
