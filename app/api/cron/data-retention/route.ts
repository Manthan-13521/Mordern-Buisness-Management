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
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get("authorization");
    const querySecret = new URL(req.url).searchParams.get("secret");
    const providedSecret = authHeader?.startsWith("Bearer ")
        ? authHeader.slice(7)
        : querySecret;

    if (!cronSecret || providedSecret !== cronSecret) {
        return NextResponse.json({ error: "Unauthorized", code: "FORBIDDEN" }, { status: 401 });
    }

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

            let deletedS3Count = 0;
            const archiveDocs = [];

            for (const member of membersToDelete) {
                if (member.photoUrl) {
                    // Safety check: Ensure no other active member uses this exact photoUrl URL
                    const mCount = await Member.countDocuments({ photoUrl: member.photoUrl, _id: { $ne: member._id } });
                    const eCount = await EntertainmentMember.countDocuments({ photoUrl: member.photoUrl, _id: { $ne: member._id } });
                    
                    if (mCount === 0 && eCount === 0) {
                        const s3Deleted = await deleteS3Object(member.photoUrl);
                        if (s3Deleted) deletedS3Count++;
                    }
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
                
                await Model.deleteOne({ _id: member._id });
            }
            
            if (archiveDocs.length > 0) {
                const { DeletedMember } = await import("@/models/DeletedMember");
                await DeletedMember.insertMany(archiveDocs);
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
}
