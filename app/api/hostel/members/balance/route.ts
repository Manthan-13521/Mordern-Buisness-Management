import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { getToken } from "next-auth/jwt";
import { HostelMember } from "@/models/HostelMember";
import { HostelPayment } from "@/models/HostelPayment";
import { HostelBlock } from "@/models/HostelBlock";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

/**
 * GET /api/hostel/members/balance
 * Returns members who have a pending balance (totalFee > sum of payments).
 */
export async function GET(req: Request) {
    try {
        const [token] = await Promise.all([getToken({ req: req as any }), dbConnect()]);
        if (!token || token.role !== "hostel_admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const hostelId = token.hostelId as string;
        if (!hostelId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        const url = new URL(req.url);
        const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
        const limit = 11;
        const skip = (page - 1) * limit;
        const block = url.searchParams.get("block") || "";

        const baseMatch: Record<string, any> = { hostelId, isDeleted: false, isActive: true };

        if (block && block !== "all") {
            const blockObj = await HostelBlock.findOne({ hostelId, name: block }).lean() as any;
            if (!blockObj) {
                return NextResponse.json({ data: [], total: 0, page, limit, totalPages: 0, totalBalance: 0 });
            }
            baseMatch.blockId = blockObj._id;
        }

        // Get all active non-deleted members with pending balance
        const members = await HostelMember.find(baseMatch)
            .populate("planId", "name price durationDays")
            .sort({ createdAt: -1 })
            .lean() as any[];

        // For each member, compute actual paid from payments collection
        const memberIds = members.map((m: any) => m._id);
        const paymentAgg = await HostelPayment.aggregate([
            { $match: { hostelId, memberId: { $in: memberIds }, status: "success" } },
            { $group: { _id: "$memberId", totalPaid: { $sum: "$amount" } } },
        ]);
        const paidMap = new Map(paymentAgg.map((p: any) => [p._id.toString(), p.totalPaid]));

        const withBalance = members
            .map((m: any) => ({
                ...m,
                totalPaid: paidMap.get(m._id.toString()) ?? 0,
                balance: m.totalFee - (paidMap.get(m._id.toString()) ?? 0),
            }))
            .filter((m: any) => m.balance > 0);

        const totalBalance = withBalance.reduce((sum, m) => sum + m.balance, 0);

        const total = withBalance.length;
        const paginated = withBalance.slice(skip, skip + limit);

        return NextResponse.json({ data: paginated, total, page, limit, totalPages: Math.ceil(total / limit), totalBalance });
    } catch (error) {
        console.error("[GET /api/hostel/members/balance]", error);
        return NextResponse.json({ error: "Failed to fetch balance members" }, { status: 500 });
    }
}
