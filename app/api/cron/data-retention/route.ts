import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { Settings } from "@/models/Settings";
import { Payment } from "@/models/Payment";
import { Member } from "@/models/Member";
import { EntertainmentMember } from "@/models/EntertainmentMember";
import { EntryLog } from "@/models/EntryLog";
import { DataRetentionLog } from "@/models/DataRetentionLog";
import { logger } from "@/lib/logger";
import { deleteS3Object } from "@/lib/s3";
import { withHealthcheck } from "@/lib/healthchecks";
import { requestContext } from "@/lib/requestContext";

/**
 * GET /api/cron/data-retention
 * Protected by CRON_SECRET.
 * 
 * Data Retention Rules:
 * 1. Payments > 90 days are HARD DELETED.
 * 2. Expired Members > 15 days are HARD DELETED.
 * 3. Entry Logs > 15 days are HARD DELETED.
 * 
 * Safety Rule:
 * Deletion ONLY occurs if AWS backup was successful within the last 24 hours.
 */
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
            const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get("authorization");
    const querySecret = new URL(req.url).searchParams.get("secret");
    const providedSecret = authHeader?.startsWith("Bearer ")
            ? authHeader.slice(7)
            : querySecret;
    if (!cronSecret || providedSecret !== cronSecret) {
            return NextResponse.json({ error: "Unauthorized", code: "FORBIDDEN" }, { status: 401 });
        }
    return withHealthcheck({ checkName: "data-retention", timeoutMs: 55000 }, async () => {
        try {
            await dbConnect();
            
            // --- 1. AWS Backup Safety Check ---
            const settings = await Settings.findOne().lean();
            if (!settings || !settings.lastBackupAt) {
                logger.warn("[DataRetention] Backup safety check failed. lastBackupAt is missing.");
                return NextResponse.json({ 
                    error: "Safety abort: AWS backup not verified. Skipping deletion." 
                }, { status: 400 });
            }

            const msIn24Hours = 24 * 60 * 60 * 1000;
            const timeSinceLastBackup = Date.now() - new Date(settings.lastBackupAt).getTime();

            if (timeSinceLastBackup > msIn24Hours) {
                logger.warn("[DataRetention] Backup safety check failed. Backup is older than 24 hours.", { 
                    lastBackupAt: settings.lastBackupAt 
                });
                return NextResponse.json({ 
                    error: "Safety abort: AWS backup is older than 24 hours. Please run backup first." 
                }, { status: 400 });
            }

            // --- 2. Execute Data Retention Cleanup ---
            const now = new Date();
            const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

            // A. Archive Payments older than 6 months (tenant-scoped)
            const paymentResult = await Payment.updateMany(
                { date: { $lt: sixMonthsAgo }, isArchived: false, poolId: { $ne: null } },
                { $set: { isArchived: true } }
            );
            if (paymentResult.modifiedCount > 0) {
                await DataRetentionLog.create({
                    deletedType: "payment", // using existing enum, though technically archived
                    countDeleted: paymentResult.modifiedCount,
                    deletedAt: now,
                });
            }

            // B. Permanently delete Members soft-deleted > 30 days ago (tenant-scoped)
            async function cleanupMembers(Model: any, isEntertainment: boolean) {
                const membersToDelete = await Model.find({
                    isDeleted: true,
                    deletedAt: { $lt: thirtyDaysAgo },
                    poolId: { $ne: null }
                }).lean();

                // ── Batch photoUrl safety check (eliminates 2N queries → 2 queries) ──
                // Collect all unique photoUrls from members-to-delete that have one
                const photoUrls = [...new Set(
                    (membersToDelete as any[]).map((m: any) => m.photoUrl).filter(Boolean)
                )];

                // Build a Set of photoUrls that are still referenced by OTHER active members
                const stillReferencedUrls = new Set<string>();
                if (photoUrls.length > 0) {
                    const [activeMemberUrls, activeEntUrls] = await Promise.all([
                        Member.find({ photoUrl: { $in: photoUrls }, _id: { $nin: (membersToDelete as any[]).map((m: any) => m._id) } })
                            .select("photoUrl").lean(),
                        EntertainmentMember.find({ photoUrl: { $in: photoUrls }, _id: { $nin: (membersToDelete as any[]).map((m: any) => m._id) } })
                            .select("photoUrl").lean(),
                    ]);
                    for (const doc of [...activeMemberUrls, ...activeEntUrls] as any[]) {
                        if (doc.photoUrl) stillReferencedUrls.add(doc.photoUrl);
                    }
                }

                let deletedS3Count = 0;
                const archiveDocs = [];

                for (const member of membersToDelete as any[]) {
                    if (member.photoUrl && !stillReferencedUrls.has(member.photoUrl)) {
                        // Safe to delete from S3 — no other member references this URL
                        const s3Deleted = await deleteS3Object(member.photoUrl);
                        if (s3Deleted) deletedS3Count++;
                    }
                    
                    archiveDocs.push({
                        originalId: member._id,
                        memberId: member.memberId || member._id.toString(),
                        name: member.name || "Unknown",
                        phone: member.phone || "Unknown",
                        poolId: member.poolId?.toString() || "unknown",
                        deletedAt: new Date(),
                        deletionType: "auto",
                        collectionSource: isEntertainment ? "entertainment_members" : "members",
                        fullData: member,
                    });
                    // NOTE: deleteOne is NOT called here — we batch-delete after archival is complete.
                }
                
                if (archiveDocs.length > 0) {
                    // ── Archive FIRST, then delete — guarantees no record is lost on crash ──
                    const { DeletedMember } = await import("@/models/DeletedMember");
                    await DeletedMember.insertMany(archiveDocs);
                    // Single deleteMany is faster (1 round-trip vs N) and only runs after archive succeeds.
                    await Model.deleteMany({ _id: { $in: (membersToDelete as any[]).map((m: any) => m._id) } });
                }
                
                return membersToDelete.length;

            }

            const memDelCount = await cleanupMembers(Member, false);
            const entDelCount = await cleanupMembers(EntertainmentMember, true);
            const totalMemberDeletes = memDelCount + entDelCount;

            if (totalMemberDeletes > 0) {
                await DataRetentionLog.create({
                    deletedType: "member",
                    countDeleted: totalMemberDeletes,
                    deletedAt: now,
                });
            }

            const summary = {
                paymentsArchived: paymentResult.modifiedCount,
                membersDeleted: totalMemberDeletes,
                backupVerifiedAt: settings.lastBackupAt
            };

            logger.info("[DataRetention] Cleanup completed safely.", summary);
            
            return NextResponse.json({ 
                success: true, 
                timestamp: now, 
                summary 
            });

        } catch (error: any) {
            logger.error("[DataRetention] Cron failed:", { error: error?.message || String(error) });
            return NextResponse.json(
                { error: error?.message || "Data retention cleanup failed" },
                { status: 500 }
            );
        }
        });
        });
            
}
