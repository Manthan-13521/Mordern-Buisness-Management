import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { HostelMember } from "@/models/HostelMember";
import { HostelPayment } from "@/models/HostelPayment";
import { HostelBlock } from "@/models/HostelBlock";
import { HostelPlan } from "@/models/HostelPlan";
import mongoose from "mongoose";
import { resolveUser, AuthUser } from "@/lib/authHelper";
export const dynamic = "force-dynamic";

/**
 * GET /api/hostel/members/balance
 * Returns members who have a pending balance (totalFee > sum of payments).
 */
export async function GET(req: Request) {
    try {
        const user = await resolveUser(req);
        await dbConnect();

        if (!user || user.role !== "hostel_admin") {
            return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }
        const hostelId = user.hostelId as string;
        if (!hostelId) return NextResponse.json({ error: "Forbidden" }, {  status: 403 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });

        const url = new URL(req.url);
        const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
        const limit = 11;
        const skip = (page - 1) * limit;
        const block = url.searchParams.get("block") || "";

        const baseMatch: Record<string, any> = { hostelId, isDeleted: false, isActive: true };

        if (block && block !== "all") {
            const blockObj = await HostelBlock.findOne({ hostelId, name: block }).lean() as any;
            if (!blockObj) {
                return NextResponse.json({ data: [], total: 0, page, limit, totalPages: 0, totalBalance: 0 }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
            }
            baseMatch.blockId = blockObj._id;
        }

        const members = await HostelMember.find({ ...baseMatch, balance: { $lt: 0 }, status: "active" })
            .populate("planId", "name price durationDays")
            .sort({ balance: 1 })
            .lean() as any[];

        const withBalance = members.map((m: any) => ({
            ...m,
            totalFee: m.rent_amount || 0,
            totalPaid: 0,
            balance: Math.abs(m.balance),
        }));

        const totalBalance = withBalance.reduce((sum, m) => sum + m.balance, 0);

        const total = withBalance.length;
        const paginated = withBalance.slice(skip, skip + limit);

        console.log("API HIT: /api/hostel/members/balance", Date.now());
        console.log("Members fetched:", members.length);
        return NextResponse.json({ data: paginated, total, totalBalance }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    } catch (error) {
        console.error("[GET /api/hostel/members/balance]", error);
        return NextResponse.json({ data: [], total: 0, totalBalance: 0, error: "Failed to fetch balance members" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}
