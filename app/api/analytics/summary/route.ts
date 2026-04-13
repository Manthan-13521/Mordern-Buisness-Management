import { NextResponse } from "next/server";
import { resolveUser, AuthUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";


export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    try {
        const [user] = await Promise.all([resolveUser(req), dbConnect()]);
        if (!user) return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });

        const poolId = user.poolId;
        if (!poolId) return NextResponse.json({ error: "No pool assigned" }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });

        // --- STEP 12 SaaS Analytics Gating ---
        try {
            const { enforceAnalyticsAccess } = await import("@/lib/saasGuard");
            await enforceAnalyticsAccess(poolId);
        } catch (e: any) {
            if (e.message === "SaaS_Feature_Gated_Analytics") {
                return NextResponse.json({ error: "Upgrade your SaaS plan to access Advanced Analytics.", isGated: true }, {  status: 403 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
            }
        }
        // -------------------------------------

        const { Payment } = await import("@/models/Payment");
        const { Ledger } = await import("@/models/Ledger");
        const { Subscription } = await import("@/models/Subscription");

        // IST day boundaries
        const now = new Date();
        const IST_OFFSET = 5.5 * 60 * 60 * 1000;
        const istNow = new Date(now.getTime() + IST_OFFSET);
        const startOfDayIST = new Date(Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate()));
        startOfDayIST.setTime(startOfDayIST.getTime() - IST_OFFSET);
        const startOfMonthIST = new Date(Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), 1));
        startOfMonthIST.setTime(startOfMonthIST.getTime() - IST_OFFSET);

        const [
            todayAgg,
            monthAgg,
            ledgerAgg,
            defaulterAgg
        ] = await Promise.all([
            // Today's revenue
            Payment.aggregate([
                { $match: { poolId, status: "success", createdAt: { $gte: startOfDayIST } } },
                { $group: { _id: null, total: { $sum: "$amount" } } }
            ]).read('secondaryPreferred'),
            // Monthly revenue
            Payment.aggregate([
                { $match: { poolId, status: "success", createdAt: { $gte: startOfMonthIST } } },
                { $group: { _id: null, total: { $sum: "$amount" } } }
            ]).read('secondaryPreferred'),
            // Ledger aggregates
            Ledger.aggregate([
                { $match: { poolId } },
                { $group: {
                    _id: null,
                    totalDue: { $sum: "$totalDue" },
                    totalPaid: { $sum: "$totalPaid" },
                    outstandingDues: { $sum: { $cond: [{ $gt: ["$balance", 0] }, "$balance", 0] } },
                    creditBalance: { $sum: { $cond: [{ $gt: ["$creditBalance", 0] }, "$creditBalance", 0] } },
                    dueCount: { $sum: { $cond: [{ $gt: ["$balance", 0] }, 1, 0] } }
                }}
            ]).read('secondaryPreferred'),
            // Defaulter Count: MongoDB pure pipeline removing JS level .map and .filter logic
            Subscription.aggregate([
                { $match: { poolId, status: "active", nextDueDate: { $lt: now } } },
                {
                    $lookup: {
                        from: "ledgers",
                        localField: "memberId",
                        foreignField: "memberId",
                        as: "ledgerInfo"
                    }
                },
                { $unwind: "$ledgerInfo" },
                { $match: { "ledgerInfo.balance": { $gt: 0 } } },
                { $count: "total" }
            ]).read('secondaryPreferred')
        ]);

        const defaulterCount = defaulterAgg[0]?.total || 0;

        const ledger = ledgerAgg[0] || { totalDue: 0, totalPaid: 0, outstandingDues: 0, creditBalance: 0, dueCount: 0 };
        const recoveryRate = ledger.totalDue > 0 ? Math.round((ledger.totalPaid / ledger.totalDue) * 100) : 100;

        return NextResponse.json({
            todayRevenue: todayAgg[0]?.total || 0,
            monthlyRevenue: monthAgg[0]?.total || 0,
            totalDue: ledger.totalDue,
            totalPaid: ledger.totalPaid,
            outstandingDues: ledger.outstandingDues,
            defaulterCount,
            recoveryRate,
            creditBalance: ledger.creditBalance,
        }, {
            headers: { "Cache-Control": "private, max-age=10, stale-while-revalidate=30" }
        });

    } catch (error) {
        console.error("[GET /api/analytics/summary]", error);
        return NextResponse.json({ error: "Server error" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}
