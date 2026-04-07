import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { HostelMember } from "@/models/HostelMember";
import { HostelPayment } from "@/models/HostelPayment";
import { HostelLog } from "@/models/HostelLog";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/hostel-cleanup
 * 
 * Hostel member lifecycle deletion cron — runs daily via vercel.json.
 * 
 * Deletion conditions (ALL must be true):
 *   1. status === "vacated"         — member has formally vacated
 *   2. vacated_at < 30 days ago     — 30-day cooling period elapsed
 *   3. Math.abs(balance) < 1        — floating-point safe zero balance check
 * 
 * NOTE: HostelPayment records are NEVER deleted (compliance / audit trail).
 * NOTE: HostelAnalytics records are NEVER deleted (permanent snapshot layer).
 */
export async function GET(req: Request) {
    // Auth: Verify CRON_SECRET header
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

        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Find all members eligible for permanent deletion
        const eligibleMembers = await HostelMember.find({
            status: "vacated",
            vacated_at: { $lt: thirtyDaysAgo },
            // Floating-point safe zero balance: accept anything within ±₹1
            balance: { $gt: -1, $lt: 1 },
        }).select("_id memberId name hostelId balance vacated_at").lean() as any[];

        if (eligibleMembers.length === 0) {
            return NextResponse.json({
                success: true,
                deleted: 0,
                message: "No vacated members eligible for deletion",
                timestamp: now,
            });
        }

        const memberIds = eligibleMembers.map((m: any) => m._id);

        // Archive before hard deleting
        const { DeletedHostelMember } = await import("@/models/DeletedHostelMember");
        const archiveDocs = eligibleMembers.map((m: any) => ({
            memberId: m.memberId,
            hostelId: m.hostelId,
            name: m.name,
            phone: m.phone || "",
            join_date: m.createdAt,
            vacated_at: m.vacated_at,
            deletedAt: now,
            originalDoc: m,
        }));
        await DeletedHostelMember.insertMany(archiveDocs, { ordered: false });

        // Hard-delete members (analytics data preserved in HostelAnalytics permanently)
        const deleteResult = await HostelMember.deleteMany({
            _id: { $in: memberIds },
        });

        // Log each deletion for audit trail
        const logEntries = eligibleMembers.map((m: any) => ({
            hostelId: m.hostelId,
            type: "auto_delete",
            memberId: m.memberId,
            memberObjectId: m._id,
            memberName: m.name,
            description: `Auto-deleted vacated member ${m.name} (${m.memberId}). Vacated: ${m.vacated_at?.toISOString()?.split("T")[0]}. Final balance: ₹${m.balance.toFixed(2)}`,
            performedBy: "cron/hostel-cleanup",
        }));

        if (logEntries.length > 0) {
            await HostelLog.insertMany(logEntries, { ordered: false });
        }

        console.log(`[Cron hostel-cleanup] ${now.toISOString()} — Deleted ${deleteResult.deletedCount} vacated members`);

        return NextResponse.json({
            success: true,
            deleted: deleteResult.deletedCount,
            memberIds: eligibleMembers.map((m: any) => m.memberId),
            timestamp: now,
        });
    } catch (error: any) {
        console.error("[GET /api/cron/hostel-cleanup]", error);
        return NextResponse.json({ error: error?.message || "Cleanup failed" }, { status: 500 });
    }
}
