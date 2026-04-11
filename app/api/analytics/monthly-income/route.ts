import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { PoolAnalytics } from "@/models/PoolAnalytics";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
    try {
        await dbConnect();
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const poolId = session.user.poolId;
        if (!poolId) {
            return NextResponse.json({ error: "No pool assigned" }, { status: 400 });
        }

        const url = new URL(req.url);
        const memberType = url.searchParams.get("type") || "all";

        // Build last 12 month keys explicitly
        const months: string[] = [];
        const now = new Date();
        for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
        }

        const incomeMap = new Map<string, number>();

        if (memberType === "all") {
            // Fast path: use snapshots for "all"
            const rows = await PoolAnalytics.find({
                poolId,
                yearMonth: { $in: months }
            }).lean();
            rows.forEach((r: any) => incomeMap.set(r.yearMonth, r.totalIncome || 0));
        } else {
            // Live aggregation for specific member types
            const { Payment } = await import("@/models/Payment");
            
            // Reconstruct exact date range for the query
            const startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
            
            const matchQuery: any = { 
                poolId,
                status: "success",
                createdAt: { $gte: startDate }
            };
            
            // Timezone offset for IST grouping is complex, but we can do a simple JS loop grouping after fetching
            const rawPayments = await Payment.find(matchQuery, "amount createdAt memberId memberCollection").populate("memberId", "memberId").lean();
            
            rawPayments.forEach((p: any) => {
                if (memberType !== "all" && p.memberId && p.memberId.memberId) {
                    const idStr = p.memberId.memberId;
                    if (memberType === "member" && !/^M(?!S)/i.test(idStr)) return;
                    if (memberType === "entertainment" && !/^MS/i.test(idStr)) return;
                }
                const date = new Date(p.createdAt);
                // Adjust for IST manually to match snapshot logic exactly
                const istTime = date.getTime() + (5.5 * 60 * 60 * 1000);
                const istDate = new Date(istTime);
                const yrMo = `${istDate.getUTCFullYear()}-${String(istDate.getUTCMonth() + 1).padStart(2, "0")}`;
                
                if (months.includes(yrMo)) {
                    incomeMap.set(yrMo, (incomeMap.get(yrMo) || 0) + p.amount);
                }
            });
        }

        // Generate the last 12 months explicitly to fill in zeros
        const finalData = months.map(month => ({
            month,
            total_income: incomeMap.get(month) || 0
        }));

        return NextResponse.json(finalData, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });

    } catch (error) {
        console.error("[GET /api/analytics/monthly-income]", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
