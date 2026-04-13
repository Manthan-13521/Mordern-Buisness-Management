import { NextResponse } from "next/server";
import { resolveUser, AuthUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";
import { activateSubscription } from "@/lib/services/subscriptionActivationService";

/**
 * POST /api/subscription/activate
 * FALLBACK: Frontend-side Razorpay success verification.
 * Used when webhook hasn't fired yet (race condition protection).
 */
export async function POST(req: Request) {
    try {
        const user = await resolveUser(req) as any;
        if (!user.id) {
            return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        const body = await req.json();
        const { razorpayOrderId, razorpayPaymentId, razorpaySignature, isMock, planType, module, blocks } = body;

        if (!planType || !module) {
            return NextResponse.json({ error: "planType and module are required" }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        if (!isMock && (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature)) {
            return NextResponse.json({ error: "Payment verification data missing" }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        await dbConnect();

        const { expiryDate, amountINR } = await activateSubscription({
            razorpayOrderId:   razorpayOrderId || `mock_order_${Date.now()}`,
            razorpayPaymentId: razorpayPaymentId || `mock_pay_${Date.now()}`,
            razorpaySignature: razorpaySignature || "",
            isMock:            isMock === true,
            userId:            user.id,
            planType,
            module,
            blocks:            blocks ? parseInt(blocks) : undefined,
        });

        return NextResponse.json({
            success:    true,
            expiryDate,
            amountINR,
            message:    "Subscription activated successfully",
        }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    } catch (error: any) {
        console.error("[POST /api/subscription/activate]", error);
        return NextResponse.json({ error: error?.message || "Activation failed" }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}
