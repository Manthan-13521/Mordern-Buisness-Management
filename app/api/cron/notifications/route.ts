import { NextResponse } from "next/server";
import { processDefaulterReminders, processDueAlerts } from "@/lib/notificationEngine";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    try {
        // Optional Vercel Cron verification
        const authHeader = req.headers.get("authorization");
        if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

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
}
