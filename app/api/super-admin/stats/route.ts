import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { Pool } from "@/models/Pool";
import { Member } from "@/models/Member";
import { Payment } from "@/models/Payment";
import { Plan } from "@/models/Plan";
import { User } from "@/models/User";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/super-admin/stats
 * Platform-wide aggregated stats for the super-admin dashboard.
 */
export async function GET(req: NextRequest) {
    try {
        await dbConnect();

        const session = await getServerSession(authOptions) as any;
        if (!session?.user || session.user.role !== "superadmin") {
            return NextResponse.json({ error: "Superadmin only", code: "FORBIDDEN" }, { status: 403 });
        }

        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Run all aggregations in parallel
        const [
            totalPools,
            activePools,
            suspendedPools,
            trialPools,
            totalMembers,
            activeMembers,
            expiredMembers,
            totalPaymentsResult,
            recentPaymentsResult,
            totalPlans,
            totalUsers,
            poolsByPlan,
        ] = await Promise.all([
            Pool.countDocuments({}),
            Pool.countDocuments({ status: "ACTIVE" }),
            Pool.countDocuments({ status: "SUSPENDED" }),
            Pool.countDocuments({ subscriptionStatus: "trial" }),
            Member.countDocuments({ isDeleted: false }),
            Member.countDocuments({ isDeleted: false, isExpired: false }),
            Member.countDocuments({ isDeleted: false, isExpired: true }),
            Payment.aggregate([
                { $match: { status: "success" } },
                { $group: { _id: null, total: { $sum: "$amount" } } },
            ]),
            Payment.aggregate([
                { $match: { status: "success", createdAt: { $gte: thirtyDaysAgo } } },
                { $group: { _id: null, total: { $sum: "$amount" } } },
            ]),
            Plan.countDocuments({ isActive: true }),
            User.countDocuments({ isActive: true }),
            Pool.aggregate([
                { $group: { _id: "$plan", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
            ]),
        ]);

        return NextResponse.json({
            pools: {
                total: totalPools,
                active: activePools,
                suspended: suspendedPools,
                onTrial: trialPools,
                byPlan: Object.fromEntries(poolsByPlan.map((p: any) => [p._id ?? "free", p.count])),
            },
            members: {
                total: totalMembers,
                active: activeMembers,
                expired: expiredMembers,
            },
            revenue: {
                allTime: totalPaymentsResult[0]?.total ?? 0,
                last30Days: recentPaymentsResult[0]?.total ?? 0,
            },
            plans: { active: totalPlans },
            users: { active: totalUsers },
            generatedAt: now,
        });
    } catch (error) {
        console.error("[GET /api/super-admin/stats]", error);
        return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
    }
}
