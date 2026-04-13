import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { HostelMember } from "@/models/HostelMember";
import { HostelBlock } from "@/models/HostelBlock";
import { HostelPlan } from "@/models/HostelPlan";
import { HostelRoom } from "@/models/HostelRoom";
import { HostelFloor } from "@/models/HostelFloor";
import { getServerSession } from "next-auth";
import { jwtVerify } from "jose";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
    try {
        await dbConnect();
                const authHeader = req.headers.get("authorization");
        let token = null;

        if (authHeader?.startsWith("Bearer ")) {
            try {
                const bearerToken = authHeader.split(" ")[1];
                const secret = new TextEncoder().encode(process.env.JWT_SECRET);
                const { payload } = await jwtVerify(bearerToken, secret);
                token = payload;
            } catch (e) {}
        }

        if (!token) {
            const session = await getServerSession(authOptions);
        token = session?.user || null;
        }

        await dbConnect();

        const session = { user: token }; // Mock session for compatibility

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        const hostelId = (session.user as any).hostelId;
        if (!hostelId) {
            return NextResponse.json({ error: "No hostel assigned" }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        const url = new URL(req.url);
        const block = url.searchParams.get("block") || "all";

        // Build last 12 month keys
        const months: string[] = [];
        const now = new Date();
        const startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
        for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
        }

        const allBlocks = await HostelBlock.find({ hostelId }).lean() as any[];
        const blockIdToName = new Map(allBlocks.map(b => [b._id.toString(), b.name]));

        // Aggregate members joined by createdAt
        const agg = await HostelMember.aggregate([
            { $match: { hostelId, createdAt: { $gte: startDate } } }, // Assuming joining tracks createdAt
            { $group: {
                _id: {
                    month: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
                    blockId: "$blockId"
                },
                totalMembers: { $sum: 1 }
            }}
        ]);

        const finalData = months.map(m => {
            const monthObj: any = { month: m };
            if (block === "all") {
                allBlocks.forEach(b => monthObj[b.name] = 0);
            } else {
                monthObj.value = 0;
            }
            return monthObj;
        });

        // Populate dynamic data
        agg.forEach(item => {
            const m = item._id.month;
            const bId = item._id.blockId?.toString();
            const bName = blockIdToName.get(bId);

            const row = finalData.find(d => d.month === m);
            if (!row) return;

            if (block === "all") {
                 if (bName) row[bName] = (row[bName] || 0) + item.totalMembers;
            } else {
                 if (bName === block) {
                     row.value += item.totalMembers;
                 }
            }
        });

        return NextResponse.json(finalData, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });

    } catch (error) {
        console.error("[GET /api/hostel/analytics/monthly-members]", error);
        return NextResponse.json({ error: "Server error" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}
