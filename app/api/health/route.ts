import { NextResponse } from "next/server";

/**
 * GET /api/health
 * Ultra-lightweight liveness probe — no DB, no Redis, no I/O.
 * Use this for uptime monitors (UptimeRobot, Better Uptime, Vercel cron, etc.)
 * For dependency checks → /api/health/ready
 */
export async function GET() {
  return NextResponse.json(
    { status: "ok" },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}
