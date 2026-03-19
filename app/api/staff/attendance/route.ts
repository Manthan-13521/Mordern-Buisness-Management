import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { Staff } from "@/models/Staff";
import { StaffAttendance } from "@/models/StaffAttendance";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * GET /api/staff/attendance
 * Paginated attendance history for a staff member or all staff in a pool.
 * ?staffId=&page=&limit=&days=30
 */
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const page    = Math.max(1, Number(searchParams.get("page")  ?? 1));
        const limit   = Math.min(200, Number(searchParams.get("limit") ?? 20));
        const days    = Number(searchParams.get("days")    ?? 30);
        const staffId = searchParams.get("staffId");
        const monthParam = searchParams.get("month"); // 1-12
        const yearParam  = searchParams.get("year");
        const poolId  = session.user.role === "superadmin"
            ? (searchParams.get("poolId") ?? session.user.poolId)
            : session.user.poolId;

        let since: Date;
        let until: Date | undefined;
        if (monthParam && yearParam) {
            const y = Number(yearParam);
            const m = Number(monthParam) - 1; // JS months are 0-indexed
            since = new Date(y, m, 1);
            until = new Date(y, m + 1, 0, 23, 59, 59, 999);
        } else {
            since = new Date();
            since.setDate(since.getDate() - days);
        }

        await connectDB();

        const filter: Record<string, unknown> = {
            poolId,
            createdAt: until ? { $gte: since, $lte: until } : { $gte: since },
        };
        if (staffId) filter.staffId = staffId;

        const [data, total] = await Promise.all([
            StaffAttendance.find(filter)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            StaffAttendance.countDocuments(filter),
        ]);

        return NextResponse.json({ data, total, page, limit });
    } catch (error) {
        console.error("[GET /api/staff/attendance]", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

/**
 * POST /api/staff/attendance
 * Record a check-in or check-out for a staff member.
 * Body: { staffId, method, type }  — method: "manual"|"faceScan", type: "checkIn"|"checkOut"
 */
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        await connectDB();
        const body = await req.json();
        const { staffId, method, type } = body;

        const poolId = session.user.poolId;

        if (!poolId || !staffId || !method || !type) {
            return NextResponse.json({ error: "Missing fields: staffId, method, type" }, { status: 400 });
        }

        const staff = await Staff.findOne({ staffId, poolId });
        if (!staff) return NextResponse.json({ error: "Staff not found" }, { status: 404 });

        const log = await StaffAttendance.create({ staffId, poolId, method, type });

        return NextResponse.json({ success: true, log });
    } catch (error: any) {
        console.error("[POST /api/staff/attendance]", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
