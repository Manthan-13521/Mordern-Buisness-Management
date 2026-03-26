import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { Member } from "@/models/Member";
import { Payment } from "@/models/Payment";
import { EntryLog } from "@/models/EntryLog";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { runOccupancyCleanupInBackground } from "@/lib/cleanup";
import { getCache, setCache } from "@/lib/membersCache";

export const dynamic = "force-dynamic";

const DASHBOARD_TTL_S = 300; // 5 minutes — safe for free Redis quota

export async function GET() {
    try {
        const [, session] = await Promise.all([
            dbConnect(),
            getServerSession(authOptions),
        ]);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        
        runOccupancyCleanupInBackground();

        const poolKey = session.user.role === "superadmin" ? "superadmin" : (session.user.poolId ?? "unknown");
        const cacheKey = `dashboard-stats-${poolKey}`;

        // ── Cache check ─────────────────────────────────────────────────────
        const cached = await getCache(cacheKey);
        if (cached) {
            return NextResponse.json(cached, {
                headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=60", "X-Cache": "HIT" },
            });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        const baseMatch = session.user.role !== "superadmin" && session.user.poolId 
            ? { poolId: session.user.poolId } 
            : {};
            
        // Execute all independent queries in parallel
        const [
            memberStats,
            entriesToday,
            revenueStats,
            expiringMembers
        ] = await Promise.all([
            Member.aggregate([
                { $match: { ...baseMatch, status: { $ne: "deleted" } } },
                { $group: {
                    _id: "$status",
                    total: { $sum: { $ifNull: ["$planQuantity", 1] } }
                }}
            ]),
            EntryLog.aggregate([
                { $match: { ...baseMatch, scanTime: { $gte: today }, status: "granted" } },
                { $group: { _id: null, total: { $sum: { $ifNull: ["$numPersons", 1] } } } }
            ]),
            Payment.aggregate([
                { $match: { ...baseMatch, status: "success", date: { $gte: firstDayOfMonth } } },
                { $group: {
                    _id: { $cond: [{ $gte: ["$date", today] }, "today", "month"] },
                    total: { $sum: "$amount" }
                }}
            ]),
            Member.find({
                ...baseMatch,
                status: "active",
                expiryDate: { 
                    $gte: today, 
                    $lte: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000) 
                }
            })
            .select('memberId name phone expiryDate planQuantity')
            .lean()
        ]);

        // Process Member Stats
        let activeMembers = 0, expiredMembers = 0;
        memberStats.forEach((stat: any) => {
            if (stat._id === 'active') activeMembers = stat.total;
            if (stat._id === 'expired') expiredMembers = stat.total;
        });
        const totalMembers = activeMembers + expiredMembers;

        // Process Revenue Stats
        let todaysRevenue = 0, monthlyRevenue = 0;
        revenueStats.forEach((stat: any) => {
            if (stat._id === 'today') todaysRevenue = stat.total;
            monthlyRevenue += stat.total; 
        });

        const response = {
            stats: {
                totalMembers,
                activeMembers,
                expiredMembers,
                todaysEntries: entriesToday[0]?.total || 0,
                todaysRevenue,
                monthlyRevenue
            },
            alerts: {
                expiringMembers: expiringMembers.map((m: any) => ({
                    id: m._id,
                    memberId: m.memberId,
                    name: m.name,
                    phone: m.phone,
                    qty: m.planQuantity || 1,
                    remainingDays: Math.ceil((new Date(m.expiryDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                }))
            }
        };

        // ── Cache result (non-blocking) ──────────────────────────────────────
        setCache(cacheKey, response).catch(() => {});

        return NextResponse.json(response, {
            headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=60", "X-Cache": "MISS" },
        });

    } catch (error) {
        console.error("[GET /api/dashboard]", error);
        return NextResponse.json({ error: "Failed to fetch dashboard" }, { status: 500 });
    }
}
