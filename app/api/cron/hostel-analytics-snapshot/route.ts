import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { HostelAnalytics } from "@/models/HostelAnalytics";
import { HostelPayment } from "@/models/HostelPayment";
import { HostelMember } from "@/models/HostelMember";
import { HostelBlock } from "@/models/HostelBlock";
import { CronLog } from "@/models/CronLog";

export const dynamic = "force-dynamic";

async function generateSnapshotForMonth(targetDate: Date, hostelId: string) {
    const yearMonth = `${targetDate.getUTCFullYear()}-${String(targetDate.getUTCMonth() + 1).padStart(2, "0")}`;

    // Calculate boundary times exactly for targetDate month
    const startOfMonth = new Date(Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), 1, 0, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth() + 1, 0, 23, 59, 59, 999));

    const [incomeResult, occupantResult] = await Promise.all([
        HostelPayment.aggregate([
            { 
                $match: { 
                    hostelId, 
                    status: "success", 
                    createdAt: { $gte: startOfMonth, $lte: endOfMonth } 
                } 
            },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]),
        HostelMember.countDocuments({
            hostelId,
            status: { $in: ["active", "defaulter"] },
            isDeleted: false,
            // Approximating occupancy bounds
            createdAt: { $lte: endOfMonth }
        })
    ]);

    const monthlyIncome = incomeResult.length > 0 ? incomeResult[0].total : 0;
    const monthlyOccupancy = occupantResult;

    await HostelAnalytics.findOneAndUpdate(
        { hostelId, yearMonth },
        {
            $set: {
                totalIncome: monthlyIncome,
                totalOccupancy: monthlyOccupancy
            }
        },
        { upsert: true }
    );

    return yearMonth;
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
            // Gap Recovery: Find the last snapshot yearMonth, evaluate missed months natively
            const lastSnapshot = await HostelAnalytics.findOne({ hostelId }).sort({ yearMonth: -1 }).lean();
            
            let pointerDate = new Date(today);
            pointerDate.setUTCDate(1); // default to this month boundary

            if (lastSnapshot && lastSnapshot.yearMonth) {
                const parts = lastSnapshot.yearMonth.split("-");
                if (parts.length === 2 && !isNaN(Number(parts[0])) && !isNaN(Number(parts[1]))) {
                    // Date.UTC with Number(parts[1]) correctly evaluates natively to the NEXT month
                    // (since parts[1] is 1-indexed string e.g. "04" -> Date.UTC(y, 4, 1) -> May 1st)
                    pointerDate = new Date(Date.UTC(Number(parts[0]), Number(parts[1]), 1));
                }
            }

            while (pointerDate.getTime() <= today.getTime()) {
                await generateSnapshotForMonth(pointerDate, hostelId);
                snapshotsCreated++;
                pointerDate = new Date(Date.UTC(pointerDate.getUTCFullYear(), pointerDate.getUTCMonth() + 1, 1)); // +1 month increment
            }
            
            // Redundancy: explicitly always ensure this month is up to date
            await generateSnapshotForMonth(today, hostelId);
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
