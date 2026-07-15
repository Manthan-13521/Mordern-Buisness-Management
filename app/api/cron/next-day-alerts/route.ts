import { NextResponse } from "next/server";
import { runNextDayExpiryAlerts } from "@/lib/services/nextDayAlertService";
import { withHealthcheck } from "@/lib/healthchecks";
import { requestContext } from "@/lib/requestContext";

export const dynamic = "force-dynamic";

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
    return withHealthcheck({ checkName: "next-day-alerts", timeoutMs: 25000 }, async () => {
            try {
                const result = await runNextDayExpiryAlerts();
                return NextResponse.json(result);
            } catch (error: any) {
                console.error("[POST /api/cron/next-day-alerts]", error);
                return NextResponse.json(
                    { error: "Next-day alert cron failed", detail: error?.message },
                    { status: 500 }
                );
            }
        });
        });
            
}

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

