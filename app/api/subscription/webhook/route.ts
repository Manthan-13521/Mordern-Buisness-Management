import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { activateSubscription } from "@/lib/services/subscriptionActivationService";
import { SubscriptionPlanType, SubscriptionModule } from "@/lib/subscriptionConfig";
import crypto from "crypto";
import { logger } from "@/lib/logger";

/**
 * POST /api/subscription/webhook
 * PRIMARY: Razorpay webhook for subscription payment events.
 * Register this URL in your Razorpay dashboard → Webhooks.
 * Secret: RAZORPAY_WEBHOOK_SECRET env var.
 */
export async function POST(req: Request) {
    try {
        const rawBody = await req.text();
        const signature = req.headers.get("x-razorpay-signature") || "";

        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
        if (webhookSecret) {
            const expectedSig = crypto
                .createHmac("sha256", webhookSecret)
                .update(rawBody)
                .digest("hex");

            if (expectedSig !== signature) {
                logger.audit({
                    type: "SUBSCRIPTION_WEBHOOK_INVALID_SIG",
                    meta: { signature },
                });
                return NextResponse.json({ error: "Invalid webhook signature" }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
            }
        }

        const event = JSON.parse(rawBody);

        // Only handle payment.captured events
        if (event.event !== "payment.captured") {
            return NextResponse.json({ status: "ignored", event: event.event }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        const payment = event.payload?.payment?.entity;
        if (!payment) {
            return NextResponse.json({ error: "Missing payment entity" }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        const { id: razorpayPaymentId, order_id: razorpayOrderId, notes } = payment;
        const { userId, planType, module, blocks } = notes || {};

        if (!userId || !planType || !module) {
            logger.error("[Subscription Webhook] Missing notes in payment", { razorpayPaymentId });
            return NextResponse.json({ error: "Missing payment notes" }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        await dbConnect();

        await activateSubscription({
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature: "", // webhook path — signature already verified above
            isMock: false,
            userId,
            planType,
            module,
            blocks: blocks ? parseInt(blocks) : undefined,
        });

        return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    } catch (error: any) {
        logger.error("[Subscription Webhook] Error", { error: error?.message });
        return NextResponse.json({ error: error?.message || "Webhook processing failed" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}
