import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { HostelMember } from "@/models/HostelMember";
import { HostelPayment } from "@/models/HostelPayment";
import { DeletedHostelMember } from "@/models/DeletedHostelMember";
import { CronLog } from "@/models/CronLog";
import { withHealthcheck } from "@/lib/healthchecks";
import { requestContext } from "@/lib/requestContext";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {

        const requestId = req ? (req.headers.get("x-request-id") || crypto.randomUUID()) : crypto.randomUUID();
        const clientIp = req ? (req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown") : "unknown";
        const routePath = req ? new URL(req.url).pathname : "unknown";
        const requestMethod = "GET";

        return requestContext.run({
            requestId,
            ip: clientIp,
            route: routePath,
            method: requestMethod,
            startTime: Date.now()
        }, async () => {
            if (req.headers.get("Authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
    return withHealthcheck({ checkName: "hostel-cleanup", timeoutMs: 25000 }, async () => {
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

                // ── Batch-fetch ALL payment histories in one query (eliminates N+1) ──
                // Previously: HostelPayment.find({ memberId }) called per member inside loop
                // Now: single $in query, grouped into a Map for O(1) lookup per member
                const allMemberIds = expiredCheckouts.map((r: any) => r._id);
                const allPayments = await HostelPayment.find({ memberId: { $in: allMemberIds } }).lean();
                const paymentsByMemberId = new Map<string, any[]>();
                for (const p of allPayments) {
                    const key = p.memberId.toString();
                    if (!paymentsByMemberId.has(key)) paymentsByMemberId.set(key, []);
                    paymentsByMemberId.get(key)!.push(p);
                }

                // Safety Archival
                const archives = [];
                for (const r of expiredCheckouts) {
                    const financialHistory = paymentsByMemberId.get(r._id.toString()) ?? [];
                    
                    archives.push({
                        originalId: r._id,
                        memberId: r.memberId,
                        name: r.name,
                        phone: r.phone,
                        hostelId: r.hostelId,
                        deletionType: "auto",
                        collectionSource: "hostel_members",
                        fullData: { 
                            ...r, 
                            transactions: financialHistory 
                        }
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
        });
        });
            
}
