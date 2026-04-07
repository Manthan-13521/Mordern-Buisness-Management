import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { EntryLog } from "@/models/EntryLog";
import { AccessLog } from "@/models/AccessLog";
import { uploadBackup } from "@/lib/s3";

export const dynamic = "force-dynamic";

/**
 * ── Prompt 3.6 Log Archival ──
 * Moves structural logs to S3 cold storage natively before they hit TTL expiration.
 * EntryLog TTL = 15 days. We target exactly 14 days old.
 */
export async function GET(req: Request) {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get("authorization");
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        await dbConnect();

        // Calculate limits: TTL runs at 15 days, we archive at 14 days.
        const now = new Date();
        const fourteenDaysAgo = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000));
        const fifteenDaysAgo = new Date(now.getTime() - (15 * 24 * 60 * 60 * 1000));

        let docsArchived = 0;

        // 1. EntryLogs Archival Map
        const entryLogsToArchive = await EntryLog.find({ 
            createdAt: { $gte: fifteenDaysAgo, $lt: fourteenDaysAgo } 
        }).lean();

        if (entryLogsToArchive.length > 0) {
            try {
                const buffer = Buffer.from(JSON.stringify(entryLogsToArchive), "utf8");
                const key = `archives/logs/entryLogs_${Date.now()}.json`;
                await uploadBackup(buffer, key, "application/json");
                
                docsArchived += entryLogsToArchive.length;
                console.log(`[Archive] S3 shipped ${entryLogsToArchive.length} EntryLogs safely.`);
                
                // Natively delete to prevent TTL fighting (safely removing them here as backup succeeded)
                await EntryLog.deleteMany({ _id: { $in: entryLogsToArchive.map(d => d._id) } });

            } catch (e) {
                console.error("[Archive] S3 EntryLog shipment failed, relying on TTL native sweep:", e);
            }
        }

        // 2. AccessLogs Archival Map
        const accessLogsToArchive = await AccessLog.find({ 
            createdAt: { $lt: fourteenDaysAgo } 
        }).lean();

        if (accessLogsToArchive.length > 0) {
            try {
                const buffer = Buffer.from(JSON.stringify(accessLogsToArchive), "utf8");
                const key = `archives/logs/accessLogs_${Date.now()}.json`;
                await uploadBackup(buffer, key, "application/json");

                docsArchived += accessLogsToArchive.length;
                console.log(`[Archive] S3 shipped ${accessLogsToArchive.length} AccessLogs safely.`);

                // Delete successfully archived logs 
                await AccessLog.deleteMany({ _id: { $in: accessLogsToArchive.map(d => d._id) } });

            } catch (e) {
                console.error("[Archive] S3 AccessLog shipment failed:", e);
            }
        }

        return NextResponse.json({ success: true, archived: docsArchived });
    } catch (e) {
        console.error("Critical Archive Cron Exception:", e);
        return NextResponse.json({ error: "Fault" }, { status: 500 });
    }
}
