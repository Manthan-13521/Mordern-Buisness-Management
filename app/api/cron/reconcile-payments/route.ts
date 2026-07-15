import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { requireCronAuth } from "@/lib/requireCronAuth";
import { PaymentIntent } from "@/models/PaymentIntent";
import { WebhookDLQ } from "@/models/WebhookDLQ";
import { activateSubscription } from "@/lib/services/subscriptionActivationService";
import { SubscriptionPaymentLog } from "@/models/SubscriptionPaymentLog";
import { logger } from "@/lib/logger";
import { withHealthcheck } from "@/lib/healthchecks";
import { requestContext } from "@/lib/requestContext";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/cron/reconcile-payments
 * FIX 4: Recovery cron that finds orphaned payments and activates them.
 *
 * Runs every 15 minutes. For each pending PaymentIntent older than 1 hour:
 *   1. Fetch the Razorpay Order to check if it was actually paid.
 *   2. If paid but not activated → call activateSubscription().
 *   3. If never paid and older than 24h → mark as expired.
 *
 * Also scans the WebhookDLQ for unresolved entries with valid order IDs.
 */
export async function GET(req: Request) {

        const requestId = req ? (req.headers.get("x-request-id") || crypto.randomUUID()) : crypto.randomUUID();
        const clientIp = req ? (req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown") : "unknown";
        const routePath = req ? new URL(req.url).pathname : "unknown";
        const requestMethod = "GET";

        return requestContext.run({
            requestId,
            ip: clientIp,
            route: routePath,
            method: requestMethod,
            startTime: Date.now()
        }, async () => {
            const authError = requireCronAuth(req);
    if (authError) return authError;
    return withHealthcheck({ checkName: "reconcile-payments", timeoutMs: 55000 }, async () => {
        const startTime = Date.now();
        const results = { recovered: 0, expired: 0, dlqRecovered: 0, errors: 0, total: 0 };

        try {
            await dbConnect();

            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

            // 1. Find pending PaymentIntents older than 1 hour (gives webhook time to fire first)
            const pendingIntents = await PaymentIntent.find({
                status: "pending",
                createdAt: { $lt: oneHourAgo },
            }).limit(50).lean();

            results.total = pendingIntents.length;

            if (pendingIntents.length === 0 && !(await hasUnresolvedDLQ())) {
                return NextResponse.json({
                    success: true,
                    message: "No pending payments to reconcile",
                    ...results,
                    elapsed: `${Date.now() - startTime}ms`,
                });
            }

            // Import Razorpay SDK
            const { razorpay: rzp } = await import("@/lib/razorpay");
            if (!rzp) {
                logger.warn("[Reconcile] Razorpay SDK not available — skipping reconciliation");
                return NextResponse.json({ success: false, error: "Razorpay SDK unavailable" }, { status: 503 });
            }


            // ── Batch-check SubscriptionPaymentLog for all pending orderIds (eliminates N queries) ──
            const pendingOrderIds = pendingIntents.map((i: any) => i.razorpayOrderId).filter(Boolean);
            const activatedLogs = await SubscriptionPaymentLog.find({
                razorpayOrderId: { $in: pendingOrderIds },
                status: "success",
            }).select("razorpayOrderId").lean() as any[];
            const activatedOrderIds = new Set(activatedLogs.map((l: any) => l.razorpayOrderId));

            // ── Fetch Razorpay orders in parallel batches of 3 (read-only, safe to parallelize) ──
            // activateSubscription() is called sequentially below — payment integrity preserved.
            const BATCH_SIZE = 3;
            const orderResults = new Map<string, any>(); // orderId -> Razorpay order object
            for (let i = 0; i < pendingIntents.length; i += BATCH_SIZE) {
                const batch = pendingIntents.slice(i, i + BATCH_SIZE);
                const fetched = await Promise.allSettled(
                    batch.map((intent: any) => rzp.orders.fetch(intent.razorpayOrderId))
                );
                for (let j = 0; j < batch.length; j++) {
                    const result = fetched[j];
                    if (result.status === "fulfilled") {
                        orderResults.set(batch[j].razorpayOrderId, result.value);
                    } else {
                        // Log but don't abort — individual errors handled in the loop below
                        logger.error("[Reconcile] Failed to fetch Razorpay order", {
                            razorpayOrderId: batch[j].razorpayOrderId,
                            error: (result.reason as any)?.message,
                        });
                    }
                }
            }

            // 2. Process each pending intent sequentially (activation must remain serial)
            for (const intent of pendingIntents) {
                try {
                    // O(1) Set lookup — replaces per-intent DB query
                    if (activatedOrderIds.has(intent.razorpayOrderId)) {
                        await PaymentIntent.updateOne({ _id: intent._id }, { $set: { status: "success" } });
                        results.recovered++;
                        continue;
                    }

                    // Use pre-fetched order — no additional Razorpay call needed
                    const order = orderResults.get(intent.razorpayOrderId) as any;
                    if (!order) {
                        // Fetch failed for this intent — skip and count as error
                        results.errors++;
                        continue;
                    }

                    if (order.status === "paid") {
                        // Order was paid — fetch the payment details
                        let paymentId = "";
                        try {
                            const payments = await (rzp.orders as any).fetchPayments(intent.razorpayOrderId) as any;
                            const capturedPayment = payments?.items?.find((p: any) => p.status === "captured");
                            paymentId = capturedPayment?.id || "";
                        } catch {
                            paymentId = `recovered_${intent.razorpayOrderId}`;
                        }

                        const notes = order.notes || {};
                        const userId = notes.userId || intent.userId?.toString();
                        const planType = notes.planType || intent.planType;
                        const module = notes.module || intent.module;
                        const blocks = notes.blocks ? parseInt(notes.blocks) : intent.blocks;
                        const referralCode = notes.referralCode || intent.referralCode;

                        if (!userId || !planType || !module) {
                            logger.error("[Reconcile] Cannot activate — missing user/plan info", {
                                razorpayOrderId: intent.razorpayOrderId,
                            });
                            results.errors++;
                            continue;
                        }

                        await activateSubscription({
                            razorpayOrderId: intent.razorpayOrderId,
                            razorpayPaymentId: paymentId,
                            razorpaySignature: "", // Cron path — order already verified via Razorpay API
                            isMock: false,
                            userId,
                            planType,
                            module,
                            blocks,
                            referralCode,
                            amountPaid: order.amount_paid / 100,
                        });

                        await PaymentIntent.updateOne({ _id: intent._id }, { $set: { status: "success" } });

                        logger.audit({
                            type: "PAYMENT_RECOVERED_BY_CRON",
                            userId,
                            meta: {
                                razorpayOrderId: intent.razorpayOrderId,
                                razorpayPaymentId: paymentId,
                                planType,
                                module,
                                amountPaid: order.amount_paid / 100,
                            },
                        });

                        results.recovered++;

                    } else if (order.status === "created" && new Date(intent.createdAt) < twentyFourHoursAgo) {
                        // Order was never paid and is older than 24 hours — expire it
                        await PaymentIntent.updateOne({ _id: intent._id }, { $set: { status: "expired" } });
                        results.expired++;

                    }
                    // else: order is "attempted" or recent "created" — leave as pending for next run

                } catch (intentErr: any) {
                    logger.error("[Reconcile] Error processing intent", {
                        razorpayOrderId: intent.razorpayOrderId,
                        error: intentErr?.message,
                    });
                    results.errors++;
                }
            }

            // 3. Scan WebhookDLQ for unresolved entries
            const dlqEntries = await WebhookDLQ.find({
                resolved: false,
                razorpayOrderId: { $exists: true, $ne: null },
                createdAt: { $lt: oneHourAgo },
            }).limit(20).lean();

            // ── Batch-fetch Razorpay orders for DLQ entries (parallel, BATCH_SIZE=3) ──
            // Same strategy as pending intents above. Activation remains strictly serial below.
            const dlqOrderResults = new Map<string, any>(); // orderId -> Razorpay order object
            const dlqToFetch = (dlqEntries as any[]).filter(
                (dlq: any) => !activatedOrderIds.has(dlq.razorpayOrderId)
            );
            for (let i = 0; i < dlqToFetch.length; i += BATCH_SIZE) {
                const batch = dlqToFetch.slice(i, i + BATCH_SIZE);
                const fetched = await Promise.allSettled(
                    batch.map((dlq: any) => rzp.orders.fetch(dlq.razorpayOrderId!))
                );
                for (let j = 0; j < batch.length; j++) {
                    const result = fetched[j];
                    if (result.status === "fulfilled") {
                        dlqOrderResults.set(batch[j].razorpayOrderId, result.value);
                    } else {
                        logger.error("[Reconcile] Failed to fetch DLQ Razorpay order", {
                            razorpayOrderId: batch[j].razorpayOrderId,
                            error: (result.reason as any)?.message,
                        });
                    }
                }
            }

            for (const dlq of dlqEntries) {
                try {
                    // O(1) Set lookup — replaces per-DLQ-entry DB query
                    if (activatedOrderIds.has(dlq.razorpayOrderId)) {
                        await WebhookDLQ.updateOne({ _id: dlq._id }, { $set: { resolved: true, resolvedAt: new Date() } });
                        results.dlqRecovered++;
                        continue;
                    }

                    // Use pre-fetched order (no extra Razorpay call)
                    // razorpayOrderId is guaranteed by the $exists/$ne query above; guard satisfies TypeScript
                    if (!dlq.razorpayOrderId) { results.errors++; continue; }
                    const order = dlqOrderResults.get(dlq.razorpayOrderId) as any;
                    if (!order) {
                        // Fetch failed for this DLQ entry — skip
                        results.errors++;
                        continue;
                    }

                    if (order.status === "paid") {
                        const notes = order.notes || {};
                        if (!notes.userId || !notes.planType || !notes.module) {
                            continue; // Cannot recover without metadata
                        }

                        let paymentId = dlq.razorpayPaymentId || "";
                        if (!paymentId) {
                            try {
                                const payments = await (rzp.orders as any).fetchPayments(dlq.razorpayOrderId) as any;
                                const capturedPayment = payments?.items?.find((p: any) => p.status === "captured");
                                paymentId = capturedPayment?.id || `dlq_recovered_${dlq.razorpayOrderId}`;
                            } catch {
                                paymentId = `dlq_recovered_${dlq.razorpayOrderId}`;
                            }
                        }

                        await activateSubscription({
                            razorpayOrderId: dlq.razorpayOrderId!,
                            razorpayPaymentId: paymentId,
                            razorpaySignature: "",
                            isMock: false,
                            userId: notes.userId,
                            planType: notes.planType,
                            module: notes.module,
                            blocks: notes.blocks ? parseInt(notes.blocks) : undefined,
                            referralCode: notes.referralCode || undefined,
                            amountPaid: order.amount_paid / 100,
                        });

                        await WebhookDLQ.updateOne({ _id: dlq._id }, { $set: { resolved: true, resolvedAt: new Date() } });

                        logger.audit({
                            type: "PAYMENT_RECOVERED_FROM_DLQ",
                            meta: {
                                razorpayOrderId: dlq.razorpayOrderId,
                                razorpayPaymentId: paymentId,
                                originalError: dlq.error,
                            },
                        });

                        results.dlqRecovered++;
                    }
                } catch (dlqErr: any) {
                    logger.error("[Reconcile] DLQ recovery error", {
                        razorpayOrderId: dlq.razorpayOrderId,
                        error: dlqErr?.message,
                    });
                    results.errors++;
                }
            }

            const elapsed = Date.now() - startTime;
            logger.info("[Reconcile] ✅ Payment reconciliation complete", {
                ...results,
                elapsed: `${elapsed}ms`,
            }, "payment");

            return NextResponse.json({
                success: true,
                ...results,
                elapsed: `${elapsed}ms`,
            });
        } catch (error: any) {
            logger.error("[Reconcile] Cron failed", { error: error?.message });
            return NextResponse.json({ error: "Reconciliation failed", detail: error?.message }, { status: 500 });
        }
        });
        });
            
}

/**
 * Support POST for manual triggering via tools/scripts
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
            return GET(req);
        });
            
}

/**
 * Quick check if there are unresolved DLQ entries worth processing.
 * Uses findOne().select("_id") — stops at the first match instead of counting the full collection.
 */
async function hasUnresolvedDLQ(): Promise<boolean> {
    try {
        const entry = await WebhookDLQ.findOne({ resolved: false }).select("_id").lean();
        return !!entry;
    } catch {
        return false;
    }
}
