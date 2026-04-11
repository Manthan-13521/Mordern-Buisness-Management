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
            return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        const poolId = session.user.poolId;
        if (!poolId) {
            return NextResponse.json({ error: "No pool assigned" }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
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

        const memMap = new Map<string, number>();

        if (memberType === "all") {
            // Use the new Pool Analytics ledger instead of raw Member grouping
            const rows = await PoolAnalytics.find({
                poolId,
                yearMonth: { $in: months }
            }).lean();
            rows.forEach((r: any) => memMap.set(r.yearMonth, r.newMembers || 0));
        } else {
            // Live aggregation for specific member types
            const startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
            const matchQuery: Record<string, unknown> = {
                poolId,
                isDeleted: false,
                createdAt: { $gte: startDate }
            };

            if (memberType === "member") {
                matchQuery.memberId = { $regex: /^M(?!S)/i };
            } else if (memberType === "entertainment") {
                matchQuery.memberId = { $regex: /^MS/i };
            }

            const { Member } = await import("@/models/Member");
            const { EntertainmentMember } = await import("@/models/EntertainmentMember");
            
            const [regularRaw, entRaw] = await Promise.all([
                Member.find(matchQuery, "createdAt").lean(),
                EntertainmentMember.find(matchQuery, "createdAt").lean(),
            ]);

            const rawMembers = [...regularRaw, ...entRaw];
                rawMembers.forEach((m: any) => {
                    const date = new Date(m.createdAt);
                    const istTime = date.getTime() + (5.5 * 60 * 60 * 1000);
                    const istDate = new Date(istTime);
                    const yrMo = `${istDate.getUTCFullYear()}-${String(istDate.getUTCMonth() + 1).padStart(2, "0")}`;
                    
                    if (months.includes(yrMo)) {
                        memMap.set(yrMo, (memMap.get(yrMo) || 0) + 1);
                    }
                });
        }

        const finalData = months.map(month => ({
            month,
            total_members: memMap.get(month) || 0
        }));

        return NextResponse.json(finalData, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });

    } catch (error) {
        console.error("[GET /api/analytics/monthly-members]", error);
        return NextResponse.json({ error: "Server error" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}
