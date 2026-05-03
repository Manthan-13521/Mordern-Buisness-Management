import { NextResponse } from "next/server";
import { resolveUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";
import { getCachedDashboard } from "@/lib/dashboardCache";

export const dynamic = "force-dynamic";

/**
 * /api/app-init — Consolidated bootstrap endpoint.
 * Returns dashboard + members summary + recent payments in a single call.
 * Reduces 3 Vercel function invocations → 1.
 * Cached in Redis for 10s with jitter.
 */
export async function GET(req: Request) {
    try {
        // Single auth check (not per sub-fetch)
        const user = await resolveUser(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const poolId = user.poolId || "superadmin";
        await dbConnect();

        // Single Redis-cached response for all dashboard data
        const cacheKey = `app-init:${poolId}`;
        
        const response = await getCachedDashboard(cacheKey, async () => {
            const { Member } = await import("@/models/Member");
            const { EntertainmentMember } = await import("@/models/EntertainmentMember");
            const { Payment } = await import("@/models/Payment");
            const { EntryLog } = await import("@/models/EntryLog");

            // IST time boundaries
            const now = new Date();
            const IST_OFFSET = 5.5 * 60 * 60 * 1000;
            const istNow = new Date(now.getTime() + IST_OFFSET);
            const startOfDayIST = new Date(
                Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate(), 0, 0, 0, 0)
            );
            startOfDayIST.setTime(startOfDayIST.getTime() - IST_OFFSET);
            const endOfDayIST = new Date(
                Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate(), 23, 59, 59, 999)
            );
            endOfDayIST.setTime(endOfDayIST.getTime() - IST_OFFSET);
            const startOfMonthIST = new Date(
                Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), 1, 0, 0, 0, 0)
            );
            startOfMonthIST.setTime(startOfMonthIST.getTime() - IST_OFFSET);

            const baseMatch = poolId && poolId !== "superadmin" ? { poolId } : {};

            // ALL sub-fetches in parallel — single DB connection, single function invocation
            const [
                regActive, entActive, regExpired, entExpired,
                regTotal, entTotal,
                entriesToday, todaysRevenue, monthlyRevenue,
                todayMembers, todayEnt,
                recentPayments,
                membersPage1,
            ] = await Promise.all([
                // Dashboard stats
                Member.countDocuments({ ...baseMatch, $or: [{ planEndDate: { $gte: startOfDayIST } }, { expiryDate: { $gte: startOfDayIST } }] }),
                EntertainmentMember.countDocuments({ ...baseMatch, $or: [{ planEndDate: { $gte: startOfDayIST } }, { expiryDate: { $gte: startOfDayIST } }] }),
                Member.countDocuments({ ...baseMatch, $and: [{ planEndDate: { $lt: startOfDayIST } }, { expiryDate: { $lt: startOfDayIST } }] }),
                EntertainmentMember.countDocuments({ ...baseMatch, $and: [{ planEndDate: { $lt: startOfDayIST } }, { expiryDate: { $lt: startOfDayIST } }] }),
                Member.countDocuments({ ...baseMatch, isDeleted: false }),
                EntertainmentMember.countDocuments({ ...baseMatch, isDeleted: false }),
                
                EntryLog.aggregate([
                    { $match: { ...baseMatch, scanTime: { $gte: startOfDayIST, $lte: endOfDayIST }, status: "granted" } },
                    { $group: { _id: null, total: { $sum: { $ifNull: ["$numPersons", 1] } } } }
                ]),
                Payment.aggregate([
                    { $match: { ...baseMatch, status: "success", createdAt: { $gte: startOfDayIST, $lte: endOfDayIST } } },
                    { $group: { _id: null, total: { $sum: "$amount" } } }
                ]),
                Payment.aggregate([
                    { $match: { ...baseMatch, status: "success", createdAt: { $gte: startOfMonthIST } } },
                    { $group: { _id: null, total: { $sum: "$amount" } } }
                ]),

                Member.countDocuments({ ...baseMatch, createdAt: { $gte: startOfDayIST, $lte: endOfDayIST } }),
                EntertainmentMember.countDocuments({ ...baseMatch, createdAt: { $gte: startOfDayIST, $lte: endOfDayIST } }),

                // Recent payments (first page)
                Payment.find({ ...baseMatch, status: "success" })
                    .sort({ createdAt: -1 })
                    .limit(20)
                    .select("memberId amount paymentMethod createdAt transactionId")
                    .lean(),

                // Members (first page, summary only)
                Member.find({ ...baseMatch, isDeleted: false })
                    .sort({ createdAt: -1 })
                    .limit(12)
                    .select("memberId name phone planEndDate expiryDate memberType accessStatus photoUrl")
                    .lean(),
            ]);

            return {
                dashboard: {
                    stats: {
                        totalMembers: regTotal + entTotal,
                        activeMembers: regActive + entActive,
                        expiredMembers: regExpired + entExpired,
                        todaysEntries: entriesToday[0]?.total || 0,
                        todaysRevenue: todaysRevenue[0]?.total || 0,
                        monthlyRevenue: monthlyRevenue[0]?.total || 0,
                        todaysMemberEntries: todayMembers,
                        todaysEntertainmentEntries: todayEnt,
                    },
                },
                members: {
                    data: membersPage1,
                    total: regTotal + entTotal,
                    page: 1,
                },
                payments: {
                    recent: recentPayments,
                    summary: {
                        todaysRevenue: todaysRevenue[0]?.total || 0,
                        monthlyRevenue: monthlyRevenue[0]?.total || 0,
                    },
                },
                meta: {
                    cachedAt: new Date().toISOString(),
                    poolId,
                },
            };
        }, 10); // 10s TTL (jitter applied internally)

        return NextResponse.json(response, {
            headers: { "Cache-Control": "private, max-age=10", "X-Cache": "APP-INIT" },
        });

    } catch (error) {
        console.error("[GET /api/app-init]", error);
        return NextResponse.json({ error: "Failed to load app data" }, { status: 500 });
    }
}
