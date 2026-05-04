import { NextResponse } from "next/server";
import { resolveUser, AuthUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";
import { Member } from "@/models/Member";
import { EntertainmentMember } from "@/models/EntertainmentMember";
import { Payment } from "@/models/Payment";
import { EntryLog } from "@/models/EntryLog";
import { getCachedDashboard } from "@/lib/dashboardCache";

import { runOccupancyCleanupInBackground } from "@/lib/cleanup";

export const dynamic = "force-dynamic";

// ── IST Timezone Helper ────────────────────────────────────────────────
function getISTDayBounds() {
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

    return { startOfDayIST, endOfDayIST, startOfMonthIST, now };
}

export async function GET(req: Request) {
    try {
        const [, user] = await Promise.all([
            dbConnect(),
            resolveUser(req),
        ]);
        if (!user) return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        
        runOccupancyCleanupInBackground();

        const { startOfDayIST, endOfDayIST, startOfMonthIST, now } = getISTDayBounds();

        const targetPoolId = new URL(req.url).searchParams.get("poolId");
        
        const baseMatch: any = { isDeleted: false };
        if (targetPoolId && user.role === "superadmin") {
            baseMatch.poolId = targetPoolId;
        } else if (user.role !== "superadmin") {
            if (!user.poolId) {
                return NextResponse.json({ error: "No pool assigned to this account" }, { status: 400, headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
            }
            baseMatch.poolId = user.poolId;
        }
            
        const poolId = baseMatch.poolId;

        // ── Redis-cached dashboard — 15s TTL to share across concurrent requests ──
        const cacheKey = `dashboard:${poolId}:stats`;
        const response = await getCachedDashboard(cacheKey, async () => {
            // ── 1. Total Members = ALL members added this year (never decreases on deletion) ──
            // Direct count from DB: current members + archived deleted members
            const currentYear = new Date().getFullYear();
            const startOfYear = new Date(currentYear, 0, 1);
            const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59, 999);
            const yearCreatedFilter = { $gte: startOfYear, $lte: endOfYear };

            const { DeletedMember } = await import("@/models/DeletedMember");
            const [
                regActiveMembers,
                entActiveMembers,
                entriesToday,
                todaysRevenueAgg,
                monthlyRevenueAgg,
                yearlyRevenueAgg,
                regExpiringMembers,
                entExpiringMembers,
                todaysMemberEntries,
                todaysEntertainmentEntries,
                expiredMembersCountResult,
                entExpiredMembersCountResult,
                regThisYear,
                entThisYear,
                deletedThisYear
            ] = await Promise.all([
                // Active = expiry is today or in the future (Trust expiryDate purely)
                Member.countDocuments({
                    ...baseMatch,
                    $or: [
                        { planEndDate: { $gte: startOfDayIST } },
                        { expiryDate: { $gte: startOfDayIST } },
                    ]
                }),
                EntertainmentMember.countDocuments({
                    ...baseMatch,
                    $or: [
                        { planEndDate: { $gte: startOfDayIST } },
                        { expiryDate: { $gte: startOfDayIST } },
                    ]
                }),

                // Today's entries — IST bounded
                EntryLog.aggregate([
                    { $match: { ...baseMatch, scanTime: { $gte: startOfDayIST, $lte: endOfDayIST }, status: "granted" } },
                    { $group: { _id: null, total: { $sum: { $ifNull: ["$numPersons", 1] } } } }
                ]),

                // Today's revenue — IST bounded, using Transactions (Payment) Model
                Payment.aggregate([
                    { $match: { ...baseMatch, status: "success", createdAt: { $gte: startOfDayIST, $lte: endOfDayIST } } },
                    { $group: { _id: null, total: { $sum: "$amount" } } }
                ]),

                // Monthly revenue — IST bounded
                Payment.aggregate([
                    { $match: { ...baseMatch, status: "success", createdAt: { $gte: startOfMonthIST } } },
                    { $group: { _id: null, total: { $sum: "$amount" } } }
                ]),
                
                // Yearly revenue
                Payment.aggregate([
                    { $match: { ...baseMatch, status: "success", createdAt: { $gte: new Date(new Date().getFullYear(), 0, 1) } } },
                    { $group: { _id: null, total: { $sum: "$amount" } } }
                ]),

                // Expiring in next 3 days
                Member.find({
                    ...baseMatch,
                    $or: [
                        { planEndDate: { $gte: startOfDayIST, $lte: new Date(startOfDayIST.getTime() + 3 * 86400000) } },
                        { expiryDate: { $gte: startOfDayIST, $lte: new Date(startOfDayIST.getTime() + 3 * 86400000) } },
                    ]
                })
                .select('memberId name phone expiryDate planEndDate planQuantity')
                .lean(),

                EntertainmentMember.find({
                    ...baseMatch,
                    $or: [
                        { planEndDate: { $gte: startOfDayIST, $lte: new Date(startOfDayIST.getTime() + 3 * 86400000) } },
                        { expiryDate: { $gte: startOfDayIST, $lte: new Date(startOfDayIST.getTime() + 3 * 86400000) } },
                    ]
                })
                .select('memberId name phone expiryDate planEndDate planQuantity')
                .lean(),

                // Today's regular member registrations
                Member.countDocuments({
                    ...baseMatch,
                    createdAt: { $gte: startOfDayIST, $lte: endOfDayIST }
                }),
                // Today's entertainment member registrations
                EntertainmentMember.countDocuments({
                    ...baseMatch,
                    createdAt: { $gte: startOfDayIST, $lte: endOfDayIST }
                }),

                // Expired members — NOW PARALLEL (was sequential before)
                Member.countDocuments({
                    ...baseMatch,
                    $and: [
                        { planEndDate: { $lt: startOfDayIST } },
                        { expiryDate: { $lt: startOfDayIST } }
                    ]
                }),
                EntertainmentMember.countDocuments({
                    ...baseMatch,
                    $and: [
                        { planEndDate: { $lt: startOfDayIST } },
                        { expiryDate: { $lt: startOfDayIST } }
                    ]
                }),

                // Immutable total counts (now inside cache)
                Member.countDocuments({ poolId, createdAt: yearCreatedFilter }),
                EntertainmentMember.countDocuments({ poolId, createdAt: yearCreatedFilter }),
                DeletedMember.countDocuments({ poolId, "fullData.createdAt": yearCreatedFilter }),
            ]);

            const activeMembers = regActiveMembers + entActiveMembers;
            const expiredMembers = expiredMembersCountResult + entExpiredMembersCountResult;
            const expiringMembers = [...regExpiringMembers, ...entExpiringMembers];
            const immutableTotalMembers = regThisYear + entThisYear + deletedThisYear;

            return {
                stats: {
                    totalMembers: immutableTotalMembers,
                    activeMembers,
                    expiredMembers,
                    todaysEntries: entriesToday[0]?.total || 0,
                    todaysRevenue: todaysRevenueAgg[0]?.total || 0,
                    monthlyRevenue: monthlyRevenueAgg[0]?.total || 0,
                    yearlyRevenue: yearlyRevenueAgg[0]?.total || 0,
                    todaysMemberEntries,
                    todaysEntertainmentEntries,
                },
                alerts: {
                    expiringMembers: expiringMembers.map((m: any) => ({
                        id: m._id,
                        memberId: m.memberId,
                        name: m.name,
                        phone: m.phone,
                        qty: m.planQuantity || 1,
                        remainingDays: Math.ceil(
                            (new Date(m.planEndDate || m.expiryDate).getTime() - startOfDayIST.getTime()) / 86400000
                        )
                    }))
                }
            };
        });

        return NextResponse.json(response, {
            headers: { "Cache-Control": "private, max-age=10", "X-Cache": "REDIS" },
        });

    } catch (error) {
        console.error("[GET /api/dashboard]", error);
        return NextResponse.json({ error: "Failed to fetch dashboard" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}
