import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { getToken } from "next-auth/jwt";
import { HostelPaymentLog } from "@/models/HostelPaymentLog";
import { HostelMember } from "@/models/HostelMember";
import { HostelBlock } from "@/models/HostelBlock";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    try {
        const [token] = await Promise.all([getToken({ req: req as any }), dbConnect()]);
        if (!token || token.role !== "hostel_admin") {
            return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }
        const hostelId = token.hostelId as string;
        if (!hostelId) {
            return NextResponse.json({ error: "No hostel specified for this account" }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        const url = new URL(req.url);
        const page  = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
        const limit = Math.max(1, parseInt(url.searchParams.get("limit") ?? "10"));
        const skip  = (page - 1) * limit;
        const block = url.searchParams.get("block") || "";

        const baseMatch: Record<string, any> = { hostelId };

        // Block filter via server-side member-ID join
        if (block && block !== "all") {
            const blockObj = await HostelBlock.findOne({ hostelId, name: block }).lean() as any;
            if (!blockObj) {
                return NextResponse.json({ data: [], total: 0, page, limit, totalPages: 0 }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
            }
            const memberIds = await HostelMember.distinct("memberId", {
                hostelId,
                blockId: blockObj._id,
                isDeleted: false,
            });
            baseMatch.memberId = { $in: memberIds };
        }

        const [logs, total] = await Promise.all([
            HostelPaymentLog.find(baseMatch)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            HostelPaymentLog.countDocuments(baseMatch),
        ]);

        return NextResponse.json({
            data: logs,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    } catch (error) {
        console.error("[GET /api/hostel/logs/payments]", error);
        return NextResponse.json({ error: "Failed to fetch payment logs" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}
