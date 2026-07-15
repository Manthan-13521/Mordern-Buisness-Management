import { NextResponse } from "next/server";
import { requestContext } from "@/lib/requestContext";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/health
 * Ultra-lightweight liveness probe — no DB, no Redis, no I/O.
 * Use this for uptime monitors (UptimeRobot, Better Uptime, Vercel cron, etc.)
 * For dependency checks → /api/health/ready
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
            return NextResponse.json({ status: "ok" },
        {
          status: 200,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
          },
        });
        });
            
}
