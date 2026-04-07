import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { HostelMember } from "@/models/HostelMember";
import { HostelBlock } from "@/models/HostelBlock";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
    try {
        await dbConnect();
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const hostelId = (session.user as any).hostelId;
        if (!hostelId) {
            return NextResponse.json({ error: "No hostel assigned" }, { status: 400 });
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

        // Aggregate members vacated by vacated_at
        const agg = await HostelMember.aggregate([
            { $match: { hostelId, status: { $in: ["vacated", "deleted"] }, vacated_at: { $gte: startDate } } },
            { $group: {
                _id: {
                    month: { $dateToString: { format: "%Y-%m", date: "$vacated_at" } },
                    blockId: "$blockId"
                },
                totalCheckouts: { $sum: 1 }
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
                 if (bName) row[bName] = (row[bName] || 0) + item.totalCheckouts;
            } else {
                 if (bName === block) {
                     row.value += item.totalCheckouts;
                 }
            }
        });

        return NextResponse.json(finalData);

    } catch (error) {
        console.error("[GET /api/hostel/analytics/monthly-checkouts]", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
