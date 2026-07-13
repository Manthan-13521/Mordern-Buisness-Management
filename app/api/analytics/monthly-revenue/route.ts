import { NextResponse } from "next/server";
import { resolveUser, AuthUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    try {
        const [user] = await Promise.all([resolveUser(req), dbConnect()]);
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });

        const poolId = user.poolId;
        if (!poolId) return NextResponse.json({ error: "No pool assigned" }, { status: 400, headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });

        const { Payment } = await import("@/models/Payment");

        // Calculate the date 12 months ago
        const now = new Date();
        const IST_OFFSET = 5.5 * 60 * 60 * 1000;
        const istNow = new Date(now.getTime() + IST_OFFSET);
        
        // Go back 11 months so we get a total of 12 months including the current month
        const twelveMonthsAgo = new Date(Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth() - 11, 1));
        twelveMonthsAgo.setTime(twelveMonthsAgo.getTime() - IST_OFFSET);

        const monthlyRevenue = await Payment.aggregate([
            { $match: { poolId, status: "success", createdAt: { $gte: twelveMonthsAgo } } },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: "%Y-%m",
                            date: "$createdAt",
                            timezone: "+05:30" // IST grouping
                        }
                    },
                    revenue: { $sum: "$amount" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } },
            { $project: { _id: 0, month: "$_id", revenue: 1, count: 1 } }
        ]);

        // Generate the last 12 months labels
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const result: { month: string; revenue: number; count: number }[] = [];
        const dataMap = new Map(monthlyRevenue.map((d: any) => [d.month, d]));

        for (let i = 11; i >= 0; i--) {
            const d = new Date(Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth() - i, 1));
            const yearStr = d.getUTCFullYear();
            const monthStr = String(d.getUTCMonth() + 1).padStart(2, "0");
            const key = `${yearStr}-${monthStr}`;
            
            const existing = dataMap.get(key);
            result.push({
                month: `${monthNames[d.getUTCMonth()]} ${yearStr.toString().substring(2)}`, // e.g., "Jan 24"
                revenue: existing?.revenue || 0,
                count: existing?.count || 0
            });
        }

        return NextResponse.json(result, {
            headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=120" }
        });

    } catch (error) {
        console.error("[GET /api/analytics/monthly-revenue]", error);
        return NextResponse.json({ error: "Server error" }, { status: 500, headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}
