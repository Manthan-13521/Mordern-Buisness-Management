import { NextResponse } from "next/server";
import { processDefaulterReminders, processDueAlerts } from "@/lib/notificationEngine";
import { withHealthcheck } from "@/lib/healthchecks";
import { requestContext } from "@/lib/requestContext";

export const dynamic = "force-dynamic";

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
            const authHeader = req.headers.get("authorization");
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
    return withHealthcheck({ checkName: "notifications", timeoutMs: 55000 }, async () => {
            try {
                // Run both notification jobs in parallel
                const [defaulterResult, dueResult] = await Promise.all([
                    processDefaulterReminders(),
                    processDueAlerts(),
                ]);

                return NextResponse.json({
                    success: true,
                    message: "Notification cron executed",
                    defaulterReminders: defaulterResult,
                    dueAlerts: dueResult,
                }, { status: 200 });

            } catch (e) {
                console.error("[Cron/Notifications] Execution failed:", e);
                return NextResponse.json({ error: "Internal error" }, { status: 500 });
            }
        });
        });
            
}
