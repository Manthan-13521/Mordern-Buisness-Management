import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
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

        // Build last 8 weeks labels (Year-Week)
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

        const memMap = new Map<string, number>();
        weeks.forEach(w => memMap.set(w, 0));

        const startDate = new Date(now.getTime() - 8 * 7 * 86400000);
        startDate.setHours(0, 0, 0, 0);

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
            const istDate = new Date(date.getTime() + IST_OFFSET);
            const weekStr = getWeekNumber(istDate);
            
            if (memMap.has(weekStr)) {
                memMap.set(weekStr, (memMap.get(weekStr) || 0) + 1);
            }
        });

        const finalData = weeks.map(week => ({
            week: week,
            total_members: memMap.get(week) || 0
        }));

        return NextResponse.json(finalData, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });

    } catch (error) {
        console.error("[GET /api/analytics/weekly-members]", error);
        return NextResponse.json({ error: "Server error" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}
