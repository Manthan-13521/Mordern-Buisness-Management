import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { Member } from "@/models/Member";
import { EntertainmentMember } from "@/models/EntertainmentMember";
import { DeletedMember } from "@/models/DeletedMember";
import { EntryLog } from "@/models/EntryLog";
import { Attendance } from "@/models/Attendance";
import { Plan } from "@/models/Plan";
import mongoose from "mongoose";

/**
 * GET /api/cron/cleanup
 * Protected by CRON_SECRET.
 *
 * Member lifecycle deletion state machine (runs daily at 2 AM via vercel.json):
 *   1. Mark expired members (planEndDate passed)
 *   2a. Soft-delete Quick Delete plan members 3 days after expiry
 *   2b. Soft-delete Standard plan members 10 days after expiry
 *   3. Purge all entry logs older than 5 days, and attendance logs 3 days after soft-delete
 *   4. Hard-delete members 6 days after soft-delete
 *   NOTE: Payments are NEVER deleted (compliance requirement).
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

    await dbConnect();

    const now = new Date();
    const results = {
        markedExpired: 0,
        softDeletedQuick: 0,
        softDeletedStandard: 0,
        logsDeleted: 0,
        attendanceDeleted: 0,
        hardDeleted: 0,
        entertainmentHardDeleted: 0,
    };

    // Get plan IDs by deletion policy
    const quickDeletePlanIds: mongoose.Types.ObjectId[] = await Plan.find({ quickDelete: true }).distinct("_id");
    const standardPlanIds: mongoose.Types.ObjectId[] = await Plan.find({ quickDelete: false }).distinct("_id");

    // Run identical logic for both member collections using any-typed handle
    const collections: [mongoose.Model<any>, boolean][] = [
        [Member as mongoose.Model<any>, false],
        [EntertainmentMember as mongoose.Model<any>, true],
    ];

    for (const [Col, isEntertainment] of collections) {
        // ─── STEP 1: Mark as expired ─────────────────────────────────────
        const expiredRes = await Col.updateMany(
            { isExpired: false, isDeleted: false, planEndDate: { $lt: now } },
            { $set: { isExpired: true, expiredAt: now, status: "expired" } }
        );
        results.markedExpired += expiredRes.modifiedCount;

        // ─── STEP 2A: Quick Delete — 3 days after expiry ──────────────────
        const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
        const quickRes = await Col.updateMany(
            {
                isExpired: true,
                isDeleted: false,
                expiredAt: { $lt: threeDaysAgo },
                planId: { $in: quickDeletePlanIds },
            },
            { $set: { isDeleted: true, deletedAt: now, deleteReason: "auto_quick", isActive: false, status: "deleted" } }
        );
        results.softDeletedQuick += quickRes.modifiedCount;

        // ─── STEP 2B: Standard — 10 days after expiry ────────────────────
        const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
        const stdRes = await Col.updateMany(
            {
                isExpired: true,
                isDeleted: false,
                expiredAt: { $lt: tenDaysAgo },
                planId: { $in: standardPlanIds },
            },
            { $set: { isDeleted: true, deletedAt: now, deleteReason: "auto_standard", isActive: false, status: "deleted" } }
        );
        results.softDeletedStandard += stdRes.modifiedCount;

        // ─── STEP 3: Purge ALL entry logs older than 5 days ───────────────
        // Fix for: "logs should be delte whithin 5 days, after photo face is not visible"
        const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
        
        // Purge old entry logs
        const entryLogPurge = await EntryLog.deleteMany({ scanTime: { $lt: fiveDaysAgo } });
        results.logsDeleted += entryLogPurge.deletedCount || 0;

        // ─── STEP 4: Hard-delete members ───────
        let hardDeleteDate;
        if (isEntertainment) {
            hardDeleteDate = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000); // 3 days post expiry
        } else {
            hardDeleteDate = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000); // 15 days post expiry
        }

        const sixDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
        
        const hardDeleteQuery = {
            $or: [
                { planEndDate: { $lt: hardDeleteDate } }, // Members fully expired past retention period
                { isDeleted: true, deletedAt: { $lt: sixDaysAgo } } // Or manually soft-deleted >6 days ago
            ]
        };

        // Still purge attendance logs for members about to be hard deleted,
        // OR soft-deleted > 3 days ago
        const toLogPurgeQuery = { 
            $or: [
                { planEndDate: { $lt: hardDeleteDate } },
                { isDeleted: true, deletedAt: { $lt: threeDaysAgo } } 
            ]
        };

        const toLogPurge: { _id: mongoose.Types.ObjectId }[] = await Col
            .find(toLogPurgeQuery)
            .select("_id")
            .lean();

        if (toLogPurge.length > 0) {
            const memberIds = toLogPurge.map((m) => m._id);
            const attRes = await Attendance.deleteMany({ userId: { $in: memberIds } });
            results.attendanceDeleted += attRes.deletedCount;
        }

        // --- Archive before hard deleting ---
        const toHardDelete = await Col.find(hardDeleteQuery).lean();
        if (toHardDelete.length > 0) {
            const archiveDocs = toHardDelete.map((doc: any) => ({
                originalId: doc._id,
                memberId: doc.memberId,
                name: doc.name,
                phone: doc.phone,
                poolId: doc.poolId,
                deletedAt: now,
                deletionType: "auto",
                collectionSource: isEntertainment ? "entertainment_members" : "members",
                fullData: doc,
            }));
            await DeletedMember.insertMany(archiveDocs);
        }

        const hardRes = await Col.deleteMany(hardDeleteQuery);

        if (isEntertainment) {
            results.entertainmentHardDeleted = hardRes.deletedCount;
        } else {
            results.hardDeleted = hardRes.deletedCount;
        }
    }

    console.log("[Cron Cleanup]", now.toISOString(), results);
    return NextResponse.json({ success: true, timestamp: now, ...results });
}
