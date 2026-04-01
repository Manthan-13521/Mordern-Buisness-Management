import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { NotificationLog } from "@/models/NotificationLog";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
    try {
        const [, session] = await Promise.all([
            dbConnect(),
            getServerSession(authOptions),
        ]);
        if (!session?.user)
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const url = new URL(req.url);
        const page  = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
        const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "20")));
        const skip  = (page - 1) * limit;

        const baseMatch =
            session.user.role !== "superadmin"
                ? { poolId: session.user.poolId || "UNASSIGNED_POOL" }
                : {};

        const [logs, total] = await Promise.all([
            NotificationLog.find({ ...baseMatch })
                .populate("memberId", "name memberId phone")
                .select("memberId type message status date sentAt")
                .sort({ date: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            NotificationLog.countDocuments({ ...baseMatch }),
        ]);

        return NextResponse.json({
            data: logs,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        }, {
            headers: { "Cache-Control": "private, max-age=10, stale-while-revalidate=30" },
        });
    } catch (error) {
        console.error("[GET /api/notifications]", error);
        return NextResponse.json(
            { error: "Failed to fetch notification logs" },
            { status: 500 }
        );
    }
}