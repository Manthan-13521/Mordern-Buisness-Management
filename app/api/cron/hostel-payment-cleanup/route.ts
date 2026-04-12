import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { HostelPayment } from "@/models/HostelPayment";
import { HostelPaymentArchive } from "@/models/HostelPaymentArchive";
import { CronLog } from "@/models/CronLog";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    if (req.headers.get("Authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const jobName = "hostel-payment-cleanup";
    const log = await CronLog.create({ jobName, status: "running" });

    try {
        await dbConnect();

        // Older than 6 months target boundary
        const cutoffDate = new Date();
        cutoffDate.setMonth(cutoffDate.getMonth() - 6);

        const stalePayments = await HostelPayment.find({
            createdAt: { $lt: cutoffDate }
        }).lean() as any[];

        if (stalePayments.length > 0) {
            const archives = stalePayments.map(p => ({
                originalPaymentId: p._id,
                hostelId: p.hostelId,
                memberId: p.memberId,
                amount: p.amount,
                paymentMethod: p.paymentMethod || "cache",
                paymentType: p.paymentType || "rent",
                status: p.status,
                originalCreatedAt: p.createdAt,
                fullData: p
            }));

            // Sync Archival Write
            await HostelPaymentArchive.insertMany(archives);

            // Hard Eviction
            await HostelPayment.deleteMany({
                _id: { $in: stalePayments.map(p => p._id) }
            });
        }

        log.status = "success";
        log.completedAt = new Date();
        log.metadata = { archivedAndDeleted: stalePayments.length };
        await log.save();

        return NextResponse.json({ 
            success: true, 
            message: `Payment cleanup job completed.`,
            details: log.metadata 
        });

    } catch (error: any) {
        log.status = "failed";
        log.error = error.message || String(error);
        log.completedAt = new Date();
        await log.save();

        console.error(`[CRON ERROR] ${jobName}:`, error);
        return NextResponse.json({ error: "Failed to cleanly archive historical hostel payments" }, { status: 500 });
    }
}
