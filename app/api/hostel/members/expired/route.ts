import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { getToken } from "next-auth/jwt";
import { HostelMember } from "@/models/HostelMember";

export const dynamic = "force-dynamic";

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
        const search = url.searchParams.get("search") || "";

        const baseMatch: Record<string, unknown> = { hostelId, isDeleted: false, status: "active", balance: { $lt: 0 } };
        if (search) baseMatch.$text = { $search: search };

        const [members, total] = await Promise.all([
            HostelMember.find(baseMatch)
                .populate("planId", "name durationDays price")
                .sort({ balance: 1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            HostelMember.countDocuments(baseMatch),
        ]);

        return NextResponse.json({ data: members, total, page, limit, totalPages: Math.ceil(total / limit) });
    } catch (error) {
        console.error("[GET /api/hostel/members/expired]", error);
        return NextResponse.json({ error: "Failed to fetch expired members" }, { status: 500 });
    }
}
