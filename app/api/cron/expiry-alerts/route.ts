import { NextResponse } from "next/server";
import { runExpiryAlerts } from "@/lib/services/expiryAlertService";
import { withHealthcheck } from "@/lib/healthchecks";
import { requestContext } from "@/lib/requestContext";

export const dynamic = "force-dynamic";

/**
 * POST /api/cron/expiry-alerts
 * Triggered daily by Vercel Cron or external scheduler.
 * Auth: Bearer token matching CRON_SECRET env var.
 *
 * Vercel cron config (vercel.json):
 * { "crons": [{ "path": "/api/cron/expiry-alerts", "schedule": "0 2 * * *" }] }
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
            const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
    return withHealthcheck({ checkName: "expiry-alerts", timeoutMs: 25000 }, async () => {
            try {
                const result = await runExpiryAlerts();
                return NextResponse.json({ success: true, ...result });
            } catch (error: any) {
                console.error("[POST /api/cron/expiry-alerts]", error);
                return NextResponse.json(
                    { error: "Expiry alert cron failed", detail: error?.message },
                    { status: 500 }
                );
            }
        });
        });
            
}

/**
 * GET /api/cron/expiry-alerts
 * Vercel invokes cron jobs via GET requests when configured in vercel.json.
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
            return POST(req);
        });
            
}

