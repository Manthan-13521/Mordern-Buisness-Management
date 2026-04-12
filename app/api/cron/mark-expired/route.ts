import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { Member } from "@/models/Member";
import { EntertainmentMember } from "@/models/EntertainmentMember";
import { CronLog } from "@/models/CronLog";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    if (req.headers.get("Authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const jobName = "mark-expired";
    const log = await CronLog.create({ jobName, status: "running" });

    try {
        await dbConnect();
        
        // Use exact date bounds to enforce strict cutoff logic
        const startOfToday = new Date();
        startOfToday.setUTCHours(0, 0, 0, 0);

        // Members whose expiryDate is strictly lesser than today (in UTC context), meaning they have expired.
        // The condition { status: "active" } prevents redundant operations on already-expired members.
        const [regResult, entResult] = await Promise.all([
            Member.updateMany(
                { expiryDate: { $lt: startOfToday }, status: "active" },
                { $set: { status: "expired", isExpired: true } }
            ),
            EntertainmentMember.updateMany(
                { expiryDate: { $lt: startOfToday }, status: "active" },
                { $set: { status: "expired", isExpired: true } }
            )
        ]);

        log.status = "success";
        log.completedAt = new Date();
        log.metadata = { 
            regularExpired: regResult.modifiedCount,
            entertainmentExpired: entResult.modifiedCount,
            totalProcessed: regResult.modifiedCount + entResult.modifiedCount
        };
        await log.save();

        return NextResponse.json({ 
            success: true, 
            message: "Expiration job completed successfully",
            details: log.metadata 
        });

    } catch (e: any) {
        log.status = "failed";
        log.error = e.message || String(e);
        log.completedAt = new Date();
        await log.save();

        console.error(`[CRON ERROR] ${jobName}:`, e);
        return NextResponse.json({ error: "Failed to run expiration cron" }, { status: 500 });
    }
}
