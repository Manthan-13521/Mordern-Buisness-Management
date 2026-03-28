import { NextResponse } from "next/server";
import { runExpiryAlerts } from "@/lib/services/expiryAlertService";

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
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
}

/**
 * GET /api/cron/expiry-alerts
 * Vercel invokes cron jobs via GET requests when configured in vercel.json.
 */
export async function GET(req: Request) {
    return POST(req);
}
