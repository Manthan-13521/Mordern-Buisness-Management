import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { Member } from "@/models/Member";
import { EntertainmentMember } from "@/models/EntertainmentMember";
import { CronLog } from "@/models/CronLog";
import { DeletedMember } from "@/models/DeletedMember";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    if (req.headers.get("Authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const jobName = "cleanup-expired";
    const log = await CronLog.create({ jobName, status: "running" });

    try {
        await dbConnect();

        // 7 days ago strictly
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 7);

        // Fetch targets where status="expired" and expiryDate is prior to 7 days ago
        const expiredRegs = await Member.find({ status: "expired", expiryDate: { $lt: cutoffDate } }).lean();
        const expiredEnts = await EntertainmentMember.find({ status: "expired", expiryDate: { $lt: cutoffDate } }).lean();

        // Safety Archival
        const archives = [];
        for (const r of expiredRegs) {
            archives.push({
                originalId: r._id,
                memberId: r.memberId || r._id.toString(),
                name: r.name || "Unknown",
                phone: r.phone || "Unknown",
                poolId: r.poolId?.toString() || "unknown",
                deletionType: "auto",
                collectionSource: "members",
                fullData: r
            });
        }
        for (const e of expiredEnts) {
            archives.push({
                originalId: e._id,
                memberId: e.memberId || e._id.toString(),
                name: e.name || "Unknown",
                phone: e.phone || "Unknown",
                poolId: e.poolId?.toString() || "unknown",
                deletionType: "auto",
                collectionSource: "entertainment_members",
                fullData: e
            });
        }

        if (archives.length > 0) {
            await DeletedMember.insertMany(archives);
            
            // Hard delete
            await Member.deleteMany({ _id: { $in: expiredRegs.map(r => r._id) } });
            await EntertainmentMember.deleteMany({ _id: { $in: expiredEnts.map(e => e._id) } });
        }

        log.status = "success";
        log.completedAt = new Date();
        log.metadata = { archivedAndDeleted: archives.length };
        await log.save();

        return NextResponse.json({ 
            success: true, 
            message: `Cleanup job completed, archived and deleted ${archives.length} member schemas.`,
            details: log.metadata 
        });

    } catch (e: any) {
        log.status = "failed";
        log.error = e.message || String(e);
        log.completedAt = new Date();
        await log.save();

        console.error(`[CRON ERROR] ${jobName}:`, e);
        return NextResponse.json({ error: "Failed to run automated cleanup script" }, { status: 500 });
    }
}
