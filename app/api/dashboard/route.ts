import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { Member } from "@/models/Member";
import { Payment } from "@/models/Payment";
import { EntryLog } from "@/models/EntryLog";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { runOccupancyCleanupInBackground } from "@/lib/cleanup";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        await connectDB();
        
        // Run background occupancy cleanup asynchronously to keep stats fresh without blocking
        runOccupancyCleanupInBackground();

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        const baseMatch = session.user.role !== "superadmin" && session.user.poolId 
            ? { poolId: session.user.poolId } 
            : {};

        // 1. Members Stats by planQuantity
        const totalMembersAgg = await Member.aggregate([
            { $match: { ...baseMatch, status: { $ne: "deleted" } } },
            { $group: { _id: null, total: { $sum: { $ifNull: ["$planQuantity", 1] } } } }
        ]);
        const totalMembers = totalMembersAgg.length > 0 ? totalMembersAgg[0].total : 0;

        const activeMembersAgg = await Member.aggregate([
            { $match: { ...baseMatch, status: "active" } },
            { $group: { _id: null, total: { $sum: { $ifNull: ["$planQuantity", 1] } } } }
        ]);
        const activeMembers = activeMembersAgg.length > 0 ? activeMembersAgg[0].total : 0;

        const expiredMembersAgg = await Member.aggregate([
            { $match: { ...baseMatch, status: "expired" } },
            { $group: { _id: null, total: { $sum: { $ifNull: ["$planQuantity", 1] } } } }
        ]);
        const expiredMembers = expiredMembersAgg.length > 0 ? expiredMembersAgg[0].total : 0;

        // 2. Entries Today
        const todaysEntriesAgg = await EntryLog.aggregate([
            { $match: { ...baseMatch, scanTime: { $gte: today }, status: "granted" } },
            { $group: { _id: null, total: { $sum: { $ifNull: ["$numPersons", 1] } } } }
        ]);
        const todaysEntries = todaysEntriesAgg.length > 0 ? todaysEntriesAgg[0].total : 0;

        // 3. Revenue Stats
        const todaysRevenueData = await Payment.aggregate([
            { $match: { ...baseMatch, date: { $gte: today }, status: "success" } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);
        const todaysRevenue = todaysRevenueData.length > 0 ? todaysRevenueData[0].total : 0;

        const monthlyRevenueData = await Payment.aggregate([
            { $match: { ...baseMatch, date: { $gte: firstDayOfMonth }, status: "success" } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);
        const monthlyRevenue = monthlyRevenueData.length > 0 ? monthlyRevenueData[0].total : 0;

        // 4. Charts Data
        // Payment Methods
        const paymentMethods = await Payment.aggregate([
            { $match: { ...baseMatch, status: "success" } },
            { $group: { _id: "$paymentMethod", count: { $sum: 1 } } }
        ]);
        const pieChartData = paymentMethods.map(item => ({
            name: item._id.toUpperCase(),
            value: item.count
        }));

        // Plan Popularity
        const planGroups = await Member.aggregate([
            { $match: { ...baseMatch, status: { $ne: "deleted" } } },
            { $group: { _id: "$planId", count: { $sum: 1 } } }
        ]);

        await connectDB();
        const { Plan } = await import("@/models/Plan");
        // Populate plan names (only non-deleted plans show in chart)
        await Plan.populate(planGroups, { path: "_id", select: "name deletedAt" });

        const planPopularityData = planGroups
            .filter((p: any) => p._id && !p._id.deletedAt) // strictly hide deleted or missing plans
            .map((p: any) => ({
                name: p._id?.name || "Unknown Plan",
                count: p.count
            }));

        // 5. Expiring Members (Alerts)
        const threeDaysFromNow = new Date(today);
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

        const expiringToday = await Member.find({
            ...baseMatch,
            status: "active",
            expiryDate: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) }
        }).select("name memberId expiryDate phone").lean();

        const expiringSoon = await Member.find({
            ...baseMatch,
            status: "active",
            expiryDate: { $gt: new Date(today.getTime() + 24 * 60 * 60 * 1000), $lte: threeDaysFromNow }
        }).select("name memberId expiryDate phone").lean();

        return NextResponse.json({
            stats: {
                totalMembers,
                activeMembers,
                expiredMembers,
                todaysEntries,
                todaysRevenue,
                monthlyRevenue,
            },
            charts: {
                paymentMethods: pieChartData,
                planPopularity: planPopularityData,
            },
            alerts: {
                expiringToday,
                expiringSoon,
            }
        });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 });
    }
}
