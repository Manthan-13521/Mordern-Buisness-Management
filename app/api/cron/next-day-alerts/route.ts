import { NextResponse } from "next/server";
import { runNextDayExpiryAlerts } from "@/lib/services/nextDayAlertService";
import { withHealthcheck } from "@/lib/healthchecks";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
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
}

export async function GET(req: Request) {
    return POST(req);
}

