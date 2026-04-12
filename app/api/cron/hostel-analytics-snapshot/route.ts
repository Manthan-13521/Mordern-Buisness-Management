import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { HostelAnalytics } from "@/models/HostelAnalytics";
import { HostelPayment } from "@/models/HostelPayment";
import { HostelMember } from "@/models/HostelMember";
import { HostelBlock } from "@/models/HostelBlock";
import { CronLog } from "@/models/CronLog";

export const dynamic = "force-dynamic";

async function generateSnapshotForDate(targetDate: Date, hostelId: string) {
    const formattedDate = `${targetDate.getUTCFullYear()}-${String(targetDate.getUTCMonth() + 1).padStart(2, "0")}-${String(targetDate.getUTCDate()).padStart(2, "0")}`;

    // Calculate boundary times exactly for targetDate
    const startOfDay = new Date(targetDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const [incomeResult, occupantResult] = await Promise.all([
        HostelPayment.aggregate([
            { 
                $match: { 
                    hostelId, 
                    status: "success", 
                    createdAt: { $gte: startOfDay, $lte: endOfDay } 
                } 
            },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]),
        HostelMember.countDocuments({
            hostelId,
            status: { $in: ["active", "defaulter"] },
            isDeleted: false,
            // Approximating occupancy for the past is tough without history tables, 
            // but we evaluate active documents created before end of that day.
            createdAt: { $lte: endOfDay }
        })
    ]);

    const dailyIncome = incomeResult.length > 0 ? incomeResult[0].total : 0;
    const dailyOccupancy = occupantResult;

    await HostelAnalytics.findOneAndUpdate(
        { hostelId, date: formattedDate },
        {
            $set: {
                totalIncome: dailyIncome,
                totalOccupancy: dailyOccupancy
            }
        },
        { upsert: true }
    );

    return formattedDate;
}

export async function GET(req: Request) {
    if (req.headers.get("Authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const jobName = "hostel-analytics-snapshot";
    const log = await CronLog.create({ jobName, status: "running" });

    try {
        await dbConnect();
        const hostels = await HostelBlock.distinct("hostelId");

        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        
        let snapshotsCreated = 0;

        for (const hostelId of hostels) {
            // Gap Recovery: Find the last snapshot date, evaluate if we missed any dates natively
            const lastSnapshot = await HostelAnalytics.findOne({ hostelId }).sort({ date: -1 }).lean();
            
            let pointerDate = new Date(today);
            if (lastSnapshot && lastSnapshot.date) {
                const parsedLast = new Date(lastSnapshot.date);
                if (!isNaN(parsedLast.getTime())) {
                    // Start filling the gap from day after last snapshot
                    pointerDate = new Date(parsedLast.getTime() + 86400000); 
                }
            }

            while (pointerDate.getTime() <= today.getTime()) {
                await generateSnapshotForDate(pointerDate, hostelId);
                snapshotsCreated++;
                pointerDate = new Date(pointerDate.getTime() + 86400000); // +1 day
            }
            
            // Redundancy: explicitly always ensure today is covered
            await generateSnapshotForDate(today, hostelId);
            snapshotsCreated++;
        }

        log.status = "success";
        log.completedAt = new Date();
        log.metadata = { snapshotsCreated, hostelsProcessed: hostels.length };
        await log.save();

        return NextResponse.json({ success: true, snapshotsCreated });
    } catch (error: any) {
        console.error(`[CRON ERROR] ${jobName}:`, error);

        // RETRY BLOCK
        try {
            log.status = "failed";
            log.error = error?.message;
            await log.save();
        } catch(e) {}

        return NextResponse.json({ error: "Analytics job failed" }, { status: 500 });
    }
}
