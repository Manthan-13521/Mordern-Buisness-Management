import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

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

        // Build last 8 weeks
        const weeks: string[] = [];
        const now = new Date();
        const IST_OFFSET = 5.5 * 60 * 60 * 1000;

        function getWeekNumber(d: Date) {
            d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
            d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
            const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
            const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
            return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
        }

        for (let i = 7; i >= 0; i--) {
            const d = new Date(now.getTime() - i * 7 * 86400000);
            const istDate = new Date(d.getTime() + IST_OFFSET);
            weeks.push(getWeekNumber(istDate));
        }

        const incomeMap = new Map<string, number>();
        weeks.forEach(w => incomeMap.set(w, 0));

        const startDate = new Date(now.getTime() - 8 * 7 * 86400000);
        startDate.setHours(0, 0, 0, 0);

        const { Payment } = await import("@/models/Payment");
        
        const matchQuery: any = { 
            poolId,
            status: "success",
            createdAt: { $gte: startDate }
        };

        const rawPayments = await Payment.find(matchQuery, "amount createdAt memberId").populate("memberId", "memberId").lean();
        
        rawPayments.forEach((p: any) => {
            if (memberType !== "all" && p.memberId && p.memberId.memberId) {
                const idStr = p.memberId.memberId;
                if (memberType === "member" && !/^M(?!S)/i.test(idStr)) return;
                if (memberType === "entertainment" && !/^MS/i.test(idStr)) return;
            }
            
            const date = new Date(p.createdAt);
            const istDate = new Date(date.getTime() + IST_OFFSET);
            const weekStr = getWeekNumber(istDate);
            
            if (incomeMap.has(weekStr)) {
                incomeMap.set(weekStr, (incomeMap.get(weekStr) || 0) + p.amount);
            }
        });

        const finalData = weeks.map(week => ({
            week: week,
            total_income: incomeMap.get(week) || 0
        }));

        return NextResponse.json(finalData);

    } catch (error) {
        console.error("[GET /api/analytics/weekly-income]", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
