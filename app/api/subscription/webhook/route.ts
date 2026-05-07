import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { activateSubscription } from "@/lib/services/subscriptionActivationService";
import { SubscriptionPaymentLog } from "@/models/SubscriptionPaymentLog";
import { getPriceKey, SUBSCRIPTION_PRICES, SubscriptionPlanType, SubscriptionModule } from "@/lib/subscriptionConfig";
import crypto from "crypto";
import { logger } from "@/lib/logger";

// ── Force Node.js runtime (crypto module not available on Edge) ──
export const runtime = "nodejs";

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

        // SECURITY: Webhook secret MUST be configured — never skip verification
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
        if (!webhookSecret) {
            logger.error("[Webhook] RAZORPAY_WEBHOOK_SECRET not configured — rejecting webhook");
            return NextResponse.json(
                { error: "Webhook not configured" },
                { status: 500, headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } }
            );
        }

        const expectedSig = crypto
            .createHmac("sha256", webhookSecret)
            .update(rawBody)
            .digest("hex");

        // Use timingSafeEqual to prevent timing side-channel attacks
        const sigBuffer = Buffer.from(signature || "", "utf8");
        const expectedBuffer = Buffer.from(expectedSig, "utf8");
        if (
            sigBuffer.length !== expectedBuffer.length ||
            !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
        ) {
            logger.audit({
                type: "SUBSCRIPTION_WEBHOOK_INVALID_SIG",
                meta: { signature },
            });
            return NextResponse.json(
                { error: "Invalid webhook signature" },
                { status: 403, headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } }
            );
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

        const { id: razorpayPaymentId, order_id: razorpayOrderId, amount: paidAmountPaise, notes } = payment;
        const { userId, planType, module, blocks, referralCode } = notes || {};

        if (!userId || !planType || !module) {
            logger.error("[Subscription Webhook] Missing notes in payment", { razorpayPaymentId });
            return NextResponse.json({ error: "Missing payment notes" }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        // ── PAYMENT AMOUNT VERIFICATION ──────────────────────────────────────
        // Cross-check the amount Razorpay actually charged against our server-side
        // pricing table. This catches tampered order flows and logic mismatches.
        const priceKey = getPriceKey(planType as SubscriptionPlanType, module as SubscriptionModule, blocks ? parseInt(blocks) : undefined);
        if (priceKey) {
            const expectedINR = SUBSCRIPTION_PRICES[priceKey];
            const expectedPaise = expectedINR * 100;
            const actualPaise = typeof paidAmountPaise === "number" ? paidAmountPaise : parseInt(paidAmountPaise || "0");

            // Allow payment if it's between minimum (₹1 for max referral) and full price
            // Referral discounts can reduce the price, but never below ₹1 (100 paise)
            const MIN_ALLOWED_PAISE = 100; // ₹1 minimum charge
            if (actualPaise < MIN_ALLOWED_PAISE || actualPaise > expectedPaise) {
                logger.audit({
                    type: "SUBSCRIPTION_AMOUNT_MISMATCH",
                    meta: {
                        razorpayPaymentId,
                        actualPaise,
                        expectedPaise,
                        planType,
                        module,
                        referralCode: referralCode || "none",
                    },
                });
                return NextResponse.json(
                    { error: "Payment amount verification failed" },
                    { status: 400, headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } }
                );
            }
        }

        await dbConnect();

        // ── IDEMPOTENCY: Prevent duplicate activation on Razorpay webhook retries ──
        // Razorpay retries webhooks on timeouts. Without this guard, the same payment
        // could activate a subscription multiple times or create duplicate payment logs.
        if (razorpayPaymentId) {
            const existing = await SubscriptionPaymentLog.findOne({
                razorpayPaymentId,
                status: "success",
            }).select("_id").lean();

            if (existing) {
                logger.info("[Webhook] Duplicate webhook — payment already processed", {
                    razorpayPaymentId,
                    razorpayOrderId,
                }, "payment");
                return NextResponse.json(
                    { success: true, duplicate: true },
                    { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } }
                );
            }
        }

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

