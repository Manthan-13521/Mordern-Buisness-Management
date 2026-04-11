import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const [session] = await Promise.all([getServerSession(authOptions), dbConnect()]);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });

        const poolId = (session.user as any).poolId;
        if (!poolId) return NextResponse.json({ error: "No pool assigned" }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });

        const { Payment } = await import("@/models/Payment");

        // IST-aware 30-day window
        const now = new Date();
        const IST_OFFSET = 5.5 * 60 * 60 * 1000;
        const istNow = new Date(now.getTime() + IST_OFFSET);
        const thirtyDaysAgo = new Date(Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate() - 29));
        thirtyDaysAgo.setTime(thirtyDaysAgo.getTime() - IST_OFFSET);

        const dailyRevenue = await Payment.aggregate([
            { $match: { poolId, status: "success", createdAt: { $gte: thirtyDaysAgo } } },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: "%Y-%m-%d",
                            date: "$createdAt",
                            timezone: "+05:30" // IST grouping
                        }
                    },
                    revenue: { $sum: "$amount" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } },
            { $project: { _id: 0, date: "$_id", revenue: 1, count: 1 } }
        ]);

        // Fill in missing days with zero
        const dateMap = new Map(dailyRevenue.map((d: any) => [d.date, d]));
        const result: { date: string; revenue: number; count: number }[] = [];

        for (let i = 29; i >= 0; i--) {
            const d = new Date(istNow.getTime());
            d.setUTCDate(d.getUTCDate() - i);
            const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
            const existing = dateMap.get(key);
            result.push({
                date: key,
                revenue: existing?.revenue || 0,
                count: existing?.count || 0
            });
        }

        return NextResponse.json(result, {
            headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=60" }
        });

    } catch (error) {
        console.error("[GET /api/analytics/trends]", error);
        return NextResponse.json({ error: "Server error" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}
