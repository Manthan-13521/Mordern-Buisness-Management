import { NextRequest, NextResponse } from "next/server";
import { resolveUser, AuthUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";
import { Staff } from "@/models/Staff";
import { StaffAttendance } from "@/models/StaffAttendance";


export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/staff/attendance
 * Paginated attendance history for a staff member or all staff in a pool.
 * ?staffId=&page=&limit=&days=30
 */
export async function GET(req: NextRequest) {
    try {
        await dbConnect();

        const user = await resolveUser(req);
        if (!user) return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });

        const { searchParams } = new URL(req.url);
        const page    = Math.max(1, Number(searchParams.get("page")  ?? 1));
        const limit   = Math.min(200, Number(searchParams.get("limit") ?? 20));
        const days    = Number(searchParams.get("days")    ?? 30);
        const staffId = searchParams.get("staffId");
        const monthParam = searchParams.get("month"); // 1-12
        const yearParam  = searchParams.get("year");
        const poolId  = user.role === "superadmin"
            ? (searchParams.get("poolId") ?? user.poolId)
            : user.poolId;

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

        return NextResponse.json({ data, total, page, limit }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    } catch (error) {
        console.error("[GET /api/staff/attendance]", error);
        return NextResponse.json({ error: "Server error" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}

/**
 * POST /api/staff/attendance
 * Record a check-in or check-out for a staff member.
 * Body: { staffId, method, type }  — method: "manual"|"faceScan", type: "checkIn"|"checkOut"
 */
export async function POST(req: Request) {
    try {
        await dbConnect();

        const user = await resolveUser(req);
        if (!user) return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });

        const body = await req.json();
        const { staffId, method, type } = body;

        const poolId = user.poolId;

        if (!poolId || !staffId || !method || !type) {
            return NextResponse.json({ error: "Missing fields: staffId, method, type" }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        const staff = await Staff.findOne({ staffId, poolId });
        if (!staff) return NextResponse.json({ error: "Staff not found" }, {  status: 404 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });

        const log = await StaffAttendance.create({ staffId, poolId, method, type });

        return NextResponse.json({ success: true, log }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    } catch (error: any) {
        console.error("[POST /api/staff/attendance]", error);
        return NextResponse.json({ error: error.message }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}
