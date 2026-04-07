import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { NotificationLog } from "@/models/NotificationLog";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTenantFilter } from "@/lib/tenant";

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

        // ── Tenant isolation guard ───────────────────────────────────────────
        if (session.user.role !== "superadmin" && !session.user.poolId) {
            return NextResponse.json({ error: "No pool assigned to this account" }, { status: 400 });
        }
        const baseMatch = getTenantFilter(session.user);

        const [logs, total] = await Promise.all([
            NotificationLog.find({ ...baseMatch })
                .populate("memberId", "name memberId phone")
                .select("memberId type message status date sentAt module actionType")
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