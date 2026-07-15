import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { requireCronAuth } from "@/lib/requireCronAuth";
import { PaymentIntent } from "@/models/PaymentIntent";
import { WebhookDLQ } from "@/models/WebhookDLQ";
import { SubscriptionPaymentLog } from "@/models/SubscriptionPaymentLog";
import { logger } from "@/lib/logger";
import { requestContext } from "@/lib/requestContext";

export const dynamic = "force-dynamic";

/**
 * GET /api/metrics/payment-metrics
 * FIX 6: Payment funnel health dashboard.
 * Returns key metrics for monitoring payment reliability.
 * Protected by cron auth (Super Admin / internal tools only).
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
    try {
            await dbConnect();

            const now = new Date();
            const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

            // ── Payment Intent Metrics ──
            const [
                intents24h, intentsSuccess24h,
                intents7d, intentsSuccess7d,
                intents30d, intentsSuccess30d,
                intentsPending,
            ] = await Promise.all([
                PaymentIntent.countDocuments({ createdAt: { $gte: last24h } }),
                PaymentIntent.countDocuments({ createdAt: { $gte: last24h }, status: "success" }),
                PaymentIntent.countDocuments({ createdAt: { $gte: last7d } }),
                PaymentIntent.countDocuments({ createdAt: { $gte: last7d }, status: "success" }),
                PaymentIntent.countDocuments({ createdAt: { $gte: last30d } }),
                PaymentIntent.countDocuments({ createdAt: { $gte: last30d }, status: "success" }),
                PaymentIntent.countDocuments({ status: "pending" }),
            ]);

            // ── Webhook DLQ Metrics ──
            const [
                dlqUnresolved,
                dlqTotal24h,
                dlqTotal7d,
                dlqTotal30d,
            ] = await Promise.all([
                WebhookDLQ.countDocuments({ resolved: false }),
                WebhookDLQ.countDocuments({ createdAt: { $gte: last24h } }),
                WebhookDLQ.countDocuments({ createdAt: { $gte: last7d } }),
                WebhookDLQ.countDocuments({ createdAt: { $gte: last30d } }),
            ]);

            // ── Recovery Metrics (intents activated late = recovered by cron) ──
            // A recovered payment has updatedAt significantly after createdAt (> 1 hour)
            const oneHourMs = 60 * 60 * 1000;
            const recoveredIntents = await PaymentIntent.countDocuments({
                status: "success",
                $expr: {
                    $gt: [
                        { $subtract: ["$updatedAt", "$createdAt"] },
                        oneHourMs,
                    ],
                },
            });

            // ── Duplicate Block Metrics ──
            const duplicatePaymentLogs = await SubscriptionPaymentLog.countDocuments({
                notes: { $regex: /duplicate/i },
            });

            // ── Activation Source (Subscription Payment Logs) ──
            const [totalActivations24h, totalActivations7d] = await Promise.all([
                SubscriptionPaymentLog.countDocuments({ status: "success", createdAt: { $gte: last24h } }),
                SubscriptionPaymentLog.countDocuments({ status: "success", createdAt: { $gte: last7d } }),
            ]);

            // ── Compute conversion rates ──
            const conversionRate24h = intents24h > 0 ? Math.round((intentsSuccess24h / intents24h) * 10000) / 100 : null;
            const conversionRate7d = intents7d > 0 ? Math.round((intentsSuccess7d / intents7d) * 10000) / 100 : null;
            const conversionRate30d = intents30d > 0 ? Math.round((intentsSuccess30d / intents30d) * 10000) / 100 : null;

            const metrics = {
                timestamp: now.toISOString(),

                // Payment Funnel
                ordersCreated:    { last24h: intents24h, last7d: intents7d, last30d: intents30d },
                ordersPaid:       { last24h: intentsSuccess24h, last7d: intentsSuccess7d, last30d: intentsSuccess30d },
                conversionRate:   { last24h: conversionRate24h, last7d: conversionRate7d, last30d: conversionRate30d },
                pendingIntents:   intentsPending,

                // Activation
                activations:      { last24h: totalActivations24h, last7d: totalActivations7d },

                // Failures & Recovery
                webhookFailures:  { unresolved: dlqUnresolved, last24h: dlqTotal24h, last7d: dlqTotal7d, last30d: dlqTotal30d },
                recoveryActivations: recoveredIntents,
                duplicateBlocks:  duplicatePaymentLogs,

                // Health Score (simple heuristic)
                healthScore: computeHealthScore({
                    conversionRate7d,
                    dlqUnresolved,
                    intentsPending,
                }),
            };

            return NextResponse.json(metrics, {
                headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" },
            });
        } catch (error: any) {
            logger.error("[Payment Metrics] Error", { error: error?.message });
            return NextResponse.json({ error: "Failed to fetch payment metrics" }, { status: 500 });
        }
        });
            
}

/**
 * Compute a simple health score (0-10) based on key metrics.
 */
function computeHealthScore(params: {
    conversionRate7d: number | null;
    dlqUnresolved: number;
    intentsPending: number;
}): { score: number; status: string } {
    let score = 10;

    // Conversion rate penalty
    if (params.conversionRate7d !== null) {
        if (params.conversionRate7d < 90) score -= 4;
        else if (params.conversionRate7d < 95) score -= 2;
        else if (params.conversionRate7d < 99) score -= 1;
    }

    // Unresolved DLQ penalty
    if (params.dlqUnresolved > 5) score -= 3;
    else if (params.dlqUnresolved > 0) score -= 1;

    // Stale pending intents penalty
    if (params.intentsPending > 10) score -= 2;
    else if (params.intentsPending > 3) score -= 1;

    score = Math.max(0, Math.min(10, score));

    let status: string;
    if (score >= 9) status = "healthy";
    else if (score >= 7) status = "degraded";
    else if (score >= 5) status = "warning";
    else status = "critical";

    return { score, status };
}
