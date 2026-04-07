import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { getToken } from "next-auth/jwt";
import { HostelLog } from "@/models/HostelLog";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    try {
        const [token] = await Promise.all([getToken({ req: req as any }), dbConnect()]);
        if (!token || token.role !== "hostel_admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const hostelId = token.hostelId as string;

        const url = new URL(req.url);
        const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
        const limit = 11;
        const skip = (page - 1) * limit;
        const typeFilter = url.searchParams.get("type") || "";

        const baseMatch: Record<string, unknown> = { hostelId };
        if (typeFilter) baseMatch.type = typeFilter;

        const [logs, total] = await Promise.all([
            HostelLog.find(baseMatch).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
            HostelLog.countDocuments(baseMatch),
        ]);

        return NextResponse.json({ data: logs, total, page, limit, totalPages: Math.ceil(total / limit) });
    } catch (error) {
        console.error("[GET /api/hostel/logs]", error);
        return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
    }
}
