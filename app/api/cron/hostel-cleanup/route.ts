import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { HostelMember } from "@/models/HostelMember";
import { DeletedHostelMember } from "@/models/DeletedHostelMember";
import { CronLog } from "@/models/CronLog";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    if (req.headers.get("Authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const jobName = "hostel-cleanup-expired";
    const log = await CronLog.create({ jobName, status: "running" });

    try {
        await dbConnect();

        // 7 days ago strictly
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 7);

        // Fetch targets where status="checkout" and checkoutDate is prior to 7 days ago
        const expiredCheckouts = await HostelMember.find({ 
            status: "checkout", 
            checkoutDate: { $lt: cutoffDate } 
        }).lean() as any[];

        // Safety Archival
        const archives = [];
        for (const r of expiredCheckouts) {
            archives.push({
                originalId: r._id,
                memberId: r.memberId,
                name: r.name,
                phone: r.phone,
                hostelId: r.hostelId,
                deletionType: "auto",
                collectionSource: "hostel_members",
                fullData: r
            });
        }

        if (archives.length > 0) {
            await DeletedHostelMember.insertMany(archives);
            
            // Hard delete cleanly from live ledger
            await HostelMember.deleteMany({ _id: { $in: expiredCheckouts.map((r: any) => r._id) } });
        }

        log.status = "success";
        log.completedAt = new Date();
        log.metadata = { archivedAndDeleted: archives.length };
        await log.save();

        return NextResponse.json({ 
            success: true, 
            message: `Cleanup job completed, archived and deleted ${archives.length} checked out hostel members.`,
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
