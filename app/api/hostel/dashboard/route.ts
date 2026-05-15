import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { HostelMember } from "@/models/HostelMember";
import { HostelPayment } from "@/models/HostelPayment";
import { HostelBlock } from "@/models/HostelBlock";
import { getHostelSettings } from "@/models/HostelSettings";
import { resolveUser, AuthUser } from "@/lib/authHelper";
import { getCachedDashboard } from "@/lib/dashboardCache";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    try {
        const [user] = await Promise.all([resolveUser(req), dbConnect()]);

        if (!user || user.role !== "hostel_admin") {
            return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }
        const hostelId = user.hostelId as string;
        if (!hostelId) return NextResponse.json({ error: "Hostel not found" }, {  status: 403 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });

        const url = new URL(req.url);
        const block = url.searchParams.get("block") || "all";

        const now = new Date();
        const currentDate = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
        const currentYearMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
        const currentYear  = String(now.getUTCFullYear());

        const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
        const startOfYear  = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
        const in3Days      = new Date(now.getTime() + 3 * 86400000);

        const [{ HostelRoom }, { HostelStats }, settings] = await Promise.all([
            import("@/models/HostelRoom"),
            import("@/models/HostelStats"),
            getHostelSettings(hostelId),
        ]);

        // ── Block scope resolution ─────────────────────────────────────────────
        let blockId: any = null;
        let scopedMemberIds: any[] | null = null; // null = "all blocks"

        if (block && block !== "all") {
            const blockObj = await HostelBlock.findOne({ hostelId, name: block }).lean() as any;
            if (!blockObj) {
                // Invalid block — return zeroed dashboard
                return NextResponse.json({
                    monthlyJoined: 0, yearlyJoined: 0,
                    monthlyIncome: 0, yearlyIncome: 0,
                    totalMembers: 0, activeMembers: 0,
                    expiredMembers: 0, expiringMembers: 0,
                    totalRevenue: 0, totalRooms: 0,
                    totalCapacity: 0, occupiedBeds: 0,
                    occupancyRate: 0, expiringList: [],
                }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
            }
            blockId = blockObj._id;
            // Pre-fetch all member IDs in this block for payment aggregations
            scopedMemberIds = await HostelMember.distinct("_id", { hostelId, blockId, isDeleted: false });
        }

        // Build base member filter
        const memberBase: Record<string, any> = { hostelId, isDeleted: false };
        if (blockId) memberBase.blockId = blockId;

        // Build base room filter
        const roomBase: Record<string, any> = { hostelId };
        if (blockId) roomBase.blockId = blockId;

        // Build base payment filter (only used for live agg when block != "all")
        const paymentBase: Record<string, any> = {
            hostelId,
            status: "success",
            isDeleted: false,
            paymentType: { $ne: "rent" },
        };
        if (scopedMemberIds !== null) paymentBase.memberId = { $in: scopedMemberIds };

        // ── Room & capacity ────────────────────────────────────────────────────
        const [roomCount, roomCapacityAgg] = await Promise.all([
            HostelRoom.countDocuments(roomBase),
            HostelRoom.aggregate([
                { $match: roomBase },
                { $group: { _id: null, total: { $sum: "$capacity" } } },
            ]).option({ maxTimeMS: 5000 }),
        ]);
        const totalRooms    = roomCount;
        const totalCapacity = roomCapacityAgg[0]?.total || 0;

        // ── Immutable Total Members (Current Year) ────────────────
        const startOfYearDt = new Date(new Date().getFullYear(), 0, 1);
        const endOfYearDt = new Date(new Date().getFullYear(), 11, 31, 23, 59, 59, 999);
        const { DeletedHostelMember } = await import("@/models/DeletedHostelMember");
        
        const [activeReg, deletedReg] = await Promise.all([
            HostelMember.countDocuments({
                hostelId,
                createdAt: { $gte: startOfYearDt, $lte: endOfYearDt }
            }),
            DeletedHostelMember.countDocuments({
                hostelId,
                join_date: { $gte: startOfYearDt, $lte: endOfYearDt }
            })
        ]);
        
        const totalMembers = activeReg + deletedReg;

        // ── Member stats (Targeted Native Filters) ──────────────────────
        const [
            activeMembers,
            defaulterMembers,
            checkoutMembers,
            expiringMembers,
            monthlyJoined,
            yearlyJoined,
            occupiedBeds,
            totalDueAgg,
        ] = await Promise.all([
            HostelMember.countDocuments({ ...memberBase, status: "active" }),
            HostelMember.countDocuments({ ...memberBase, status: "defaulter" }),
            HostelMember.countDocuments({ ...memberBase, status: "checkout" }),
            HostelMember.countDocuments({ ...memberBase, status: { $in: ["active", "defaulter"] }, due_date: { $gte: now, $lte: in3Days } }),
            HostelMember.countDocuments({ ...memberBase, createdAt: { $gte: startOfMonth } }),
            HostelMember.countDocuments({ ...memberBase, createdAt: { $gte: startOfYear } }),
            HostelMember.countDocuments({ ...memberBase, status: { $in: ["active", "defaulter"] } }),
            HostelMember.aggregate([
                { $match: { ...memberBase, balance: { $lt: 0 }, status: "active", isActive: true } },
                { $group: { _id: null, total: { $sum: "$balance" } } }
            ]).option({ maxTimeMS: 5000 }),
        ]);

        const totalDue = Math.abs(totalDueAgg[0]?.total || 0);

        // ── Income stats ───────────────────────────────────────────────────────
        // CANONICAL SOURCE: Live HostelPayment aggregation for ALL cases.
        // This ensures dashboard numbers match analytics chart values exactly.
        // HostelAnalytics snapshots may be incomplete for legacy payments.
        let monthlyIncome = 0;
        let yearlyIncome  = 0;
        let totalRevenue  = 0;

        // Live aggregation (consistent with /api/hostel/analytics/monthly-income)
        const [monthlyAgg, yearlyAgg, totalAgg] = await Promise.all([
            HostelPayment.aggregate([
                { $match: { ...paymentBase, createdAt: { $gte: startOfMonth } } },
                { $group: { _id: null, total: { $sum: "$amount" } } },
            ]).option({ maxTimeMS: 5000 }),
            HostelPayment.aggregate([
                { $match: { ...paymentBase, createdAt: { $gte: startOfYear } } },
                { $group: { _id: null, total: { $sum: "$amount" } } },
            ]).option({ maxTimeMS: 5000 }),
            HostelPayment.aggregate([
                { $match: paymentBase },
                { $group: { _id: null, total: { $sum: "$amount" } } },
            ]).option({ maxTimeMS: 5000 }),
        ]);
        monthlyIncome = monthlyAgg[0]?.total ?? 0;
        yearlyIncome  = yearlyAgg[0]?.total ?? 0;
        totalRevenue  = totalAgg[0]?.total ?? 0;

        const occupancyRate = totalCapacity > 0 ? Math.round((occupiedBeds / totalCapacity) * 100) : 0;

        // ── Expiring soon list ─────────────────────────────────────────────────
        const expiringList = await HostelMember.find({
            ...memberBase,
            status: "active",
            due_date: { $gte: now, $lte: in3Days },
        })
            .select("memberId name phone due_date blockNo floorNo roomNo")
            .sort({ due_date: 1 })
            .limit(20)
            .lean();

        return NextResponse.json({
            monthlyJoined, yearlyJoined,
            monthlyIncome, yearlyIncome,
            totalMembers, activeMembers,
            defaulterMembers, checkoutMembers,
            expiringMembers,
            totalRevenue, totalRooms,
            totalCapacity, occupiedBeds,
            occupancyRate, expiringList,
            totalDue,
        }, { headers: { "Cache-Control": "private, max-age=10", "X-Cache": "REDIS" } });
    } catch (error) {
        console.error("[GET /api/hostel/dashboard]", error);
        return NextResponse.json({ error: "Failed to fetch dashboard" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}
