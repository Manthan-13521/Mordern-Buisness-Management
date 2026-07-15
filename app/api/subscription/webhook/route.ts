import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { activateSubscription } from "@/lib/services/subscriptionActivationService";
import { SubscriptionPaymentLog } from "@/models/SubscriptionPaymentLog";
import { WebhookDLQ } from "@/models/WebhookDLQ";
import { getPriceKey, SUBSCRIPTION_PRICES, SubscriptionPlanType, SubscriptionModule } from "@/lib/subscriptionConfig";
import crypto from "crypto";
import { logger } from "@/lib/logger";
import { requestContext } from "@/lib/requestContext";

// ── Force Node.js runtime (crypto module not available on Edge) ──
export const runtime = "nodejs";

/**
 * POST /api/subscription/webhook
 * PRIMARY: Razorpay webhook for subscription payment events.
 * Register this URL in your Razorpay dashboard → Webhooks.
 * Secret: RAZORPAY_WEBHOOK_SECRET env var.
 *
 * FIX 1: Now fetches Order from Razorpay when payment.notes is empty (UPI flows).
 * FIX 5: Failed webhooks are stored in WebhookDLQ instead of being discarded.
 */
export async function POST(req: Request) {

        const requestId = req ? (req.headers.get("x-request-id") || crypto.randomUUID()) : crypto.randomUUID();
        const clientIp = req ? (req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown") : "unknown";
        const routePath = req ? new URL(req.url).pathname : "unknown";
        const requestMethod = "POST";

        return requestContext.run({
            requestId,
            ip: clientIp,
            route: routePath,
            method: requestMethod,
            startTime: Date.now()
        }, async () => {
            if ((globalThis as any).__ENV_INVALID) {
            return Response.json({ error: "Service misconfigured" }, { status: 503 });
        }
    let rawBody = "";
    let parsedEvent: any = null;
    try {
            rawBody = await req.text();
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

            parsedEvent = JSON.parse(rawBody);

            // Handle payment.captured and order.paid events (Razorpay sends both)
            const supportedEvents = ["payment.captured", "order.paid"];
            if (!supportedEvents.includes(parsedEvent.event)) {
                return NextResponse.json({ status: "ignored", event: parsedEvent.event }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
            }

            const payment = parsedEvent.payload?.payment?.entity;
            if (!payment) {
                await saveToDLQ(parsedEvent.event, undefined, undefined, rawBody, "Missing payment entity in webhook payload");
                // Return 200 to prevent Razorpay from retrying a deterministic failure
                return NextResponse.json({ status: "dlq", reason: "missing_payment_entity" }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
            }

            const { id: razorpayPaymentId, order_id: razorpayOrderId, amount: paidAmountPaise } = payment;

            // ── FIX 1: RESOLVE NOTES — Payment notes first, then Order notes as fallback ──
            // Razorpay attaches notes to the Order, but may not copy them to the Payment entity
            // in certain UPI flows (Google Pay, PhonePe). This was the root cause of the
            // 1-in-40 payment activation failure.
            let notes = payment.notes || {};
            let notesSource = "payment";

            if (!notes.userId || !notes.planType || !notes.module) {
                // Payment notes are missing critical fields — fetch Order from Razorpay
                logger.warn("[Webhook] Payment notes missing critical fields — fetching Order from Razorpay", {
                    razorpayPaymentId,
                    razorpayOrderId,
                    paymentNotesKeys: Object.keys(notes),
                });

                if (razorpayOrderId) {
                    try {
                        const { razorpay: rzp } = await import("@/lib/razorpay");
                        if (rzp) {
                            const order = await rzp.orders.fetch(razorpayOrderId) as any;
                            if (order?.notes?.userId) {
                                notes = order.notes;
                                notesSource = "order";
                                logger.info("[Webhook] ✅ Recovered notes from Razorpay Order", {
                                    razorpayOrderId,
                                    userId: notes.userId,
                                    planType: notes.planType,
                                    module: notes.module,
                                }, "payment");
                            }
                        }
                    } catch (orderFetchErr: any) {
                        logger.error("[Webhook] Failed to fetch Order from Razorpay", {
                            razorpayOrderId,
                            error: orderFetchErr?.message,
                        });
                    }
                }

                // Also try order entity from webhook payload as a second fallback
                if (!notes.userId && parsedEvent.payload?.order?.entity?.notes) {
                    const orderEntityNotes = parsedEvent.payload.order.entity.notes;
                    if (orderEntityNotes.userId) {
                        notes = orderEntityNotes;
                        notesSource = "webhook_order_entity";
                        logger.info("[Webhook] ✅ Recovered notes from webhook order entity", {
                            razorpayOrderId,
                            userId: notes.userId,
                        }, "payment");
                    }
                }
            }

            const { userId, planType, module, blocks, referralCode } = notes;

            if (!userId || !planType || !module) {
                // All three sources failed — save to DLQ for manual recovery
                logger.error("[Webhook] Missing notes in payment — all recovery paths exhausted", {
                    razorpayPaymentId,
                    razorpayOrderId,
                    notesSource,
                    paymentNotesKeys: Object.keys(payment.notes || {}),
                });
                await saveToDLQ(parsedEvent.event, razorpayPaymentId, razorpayOrderId, rawBody, `Missing payment notes (tried: payment, order API, webhook order entity). notesSource=${notesSource}`);
                // Return 200 to Razorpay to stop retries of a deterministic failure
                return NextResponse.json({ status: "dlq", reason: "missing_notes" }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
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
                    await saveToDLQ(parsedEvent.event, razorpayPaymentId, razorpayOrderId, rawBody, `Amount mismatch: actual=${actualPaise} expected=${expectedPaise}`);
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
                referralCode: referralCode || undefined, // FIX 1: Pass referralCode (was missing before)
                amountPaid: paidAmountPaise / 100, // Pass actual amount paid
            });

            logger.info("[Webhook] ✅ Payment activated successfully", {
                razorpayPaymentId,
                razorpayOrderId,
                notesSource,
                userId,
                planType,
                module,
            }, "payment");

            return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        } catch (error: any) {
            logger.error("[Subscription Webhook] Error", { error: error?.message });

            // FIX 5: Save failed webhook to DLQ for manual recovery
            const payment = parsedEvent?.payload?.payment?.entity;
            await saveToDLQ(
                parsedEvent?.event || "unknown",
                payment?.id,
                payment?.order_id,
                rawBody,
                error?.message || "Webhook processing failed"
            );

            // Return 200 after DLQ save to prevent Razorpay from retrying deterministic failures.
            // The recovery cron will handle DLQ entries.
            return NextResponse.json(
                { status: "dlq", error: error?.message || "Webhook processing failed" },
                { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } }
            );
        }
        });
            
}

/**
 * FIX 5: Save a failed webhook payload to the Dead Letter Queue.
 * Non-throwing — errors here are logged but never bubble up.
 */
async function saveToDLQ(
    eventType: string,
    razorpayPaymentId: string | undefined,
    razorpayOrderId: string | undefined,
    rawPayload: string,
    error: string
): Promise<void> {
    try {
        await dbConnect();
        await WebhookDLQ.findOneAndUpdate(
            { razorpayPaymentId: razorpayPaymentId || `unknown_${Date.now()}` },
            {
                $set: { error, payload: rawPayload },
                $setOnInsert: {
                    eventType,
                    razorpayPaymentId,
                    razorpayOrderId,
                },
                $inc: { retryCount: 1 },
            },
            { upsert: true }
        );
        logger.info("[Webhook DLQ] Saved failed webhook to DLQ", {
            eventType, razorpayPaymentId, razorpayOrderId, error,
        });
    } catch (dlqErr: any) {
        // Last-resort logging — DLQ save itself failed
        logger.error("[Webhook DLQ] CRITICAL: Failed to save to DLQ", {
            error: dlqErr?.message,
            originalError: error,
            razorpayPaymentId,
        });
    }
}
