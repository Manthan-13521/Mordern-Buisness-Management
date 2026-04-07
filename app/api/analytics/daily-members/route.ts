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

        // Build last 14 days
        const days: string[] = [];
        const now = new Date();
        const IST_OFFSET = 5.5 * 60 * 60 * 1000;
        
        for (let i = 13; i >= 0; i--) {
            const d = new Date(now.getTime() - i * 86400000);
            const istDate = new Date(d.getTime() + IST_OFFSET);
            days.push(istDate.toISOString().split('T')[0]);
        }

        const memMap = new Map<string, number>();
        days.forEach(day => memMap.set(day, 0));

        const startDate = new Date(now.getTime() - 14 * 86400000);
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
            const dayStr = istDate.toISOString().split('T')[0];
            
            if (memMap.has(dayStr)) {
                memMap.set(dayStr, (memMap.get(dayStr) || 0) + 1);
            }
        });

        const finalData = days.map(day => ({
            date: day,
            total_members: memMap.get(day) || 0
        }));

        return NextResponse.json(finalData);

    } catch (error) {
        console.error("[GET /api/analytics/daily-members]", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
