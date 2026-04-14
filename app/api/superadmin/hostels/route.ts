import { NextResponse } from "next/server";
import { resolveUser, AuthUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";

import { Hostel } from "@/models/Hostel";

export const dynamic = "force-dynamic";

// GET /api/superadmin/hostels — list all hostel tenants
export async function GET(req: Request) {
    try {
        const [user] = await Promise.all([resolveUser(req), dbConnect()]);
        if (!user || user.role !== "superadmin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const url = new URL(req.url);
        const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
        const limit = Math.min(100, parseInt(url.searchParams.get("limit") ?? "20"));
        const skip = (page - 1) * limit;
        const search = url.searchParams.get("search") || "";

        const query: Record<string, unknown> = {};
        if (search) query.hostelName = { $regex: search, $options: "i" };

        const [hostels, total] = await Promise.all([
            Hostel.find(query)
                .select("hostelId hostelName slug city adminEmail adminPhone numberOfBlocks status plan subscriptionStatus isTwilioConnected createdAt memberCounter")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Hostel.countDocuments(query),
        ]);

        return NextResponse.json({ data: hostels, total, page, limit, totalPages: Math.ceil(total / limit) });
    } catch (error) {
        console.error("[GET /api/superadmin/hostels]", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
