import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { getToken } from "@/lib/universalAuth";
import { HostelStaffAttendance } from "@/models/HostelStaffAttendance";

export const dynamic = "force-dynamic";

// GET /api/hostel/staff/attendance
// Returns attendance array for a staffId constrained by days
export async function GET(req: NextRequest) {
    try {
        const [token] = await Promise.all([getToken({ req: req as any }), dbConnect()]);
        if (!token || token.role !== "hostel_admin") return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        const hostelId = token.hostelId as string;

        const { searchParams } = new URL(req.url);
        const staffId = searchParams.get("staffId");
        const days = Number(searchParams.get("days") || 62);

        if (!staffId) return NextResponse.json({ error: "staffId required" }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });

        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - days);

        const attendance = await HostelStaffAttendance.find({
            hostelId, staffId,
            createdAt: { $gte: pastDate }
        }).sort({ date: 1 }).lean();

        return NextResponse.json({ data: attendance }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    } catch (error) {
        console.error("[GET /api/hostel/staff/attendance]", error);
        return NextResponse.json({ error: "Server error" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}

// POST /api/hostel/staff/attendance
// Receives { staffId, type: "checkIn" | "checkOut" }
export async function POST(req: NextRequest) {
    try {
        const [token, body] = await Promise.all([getToken({ req: req as any }), req.json()]);
        await dbConnect();
        if (!token || token.role !== "hostel_admin") return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        const hostelId = token.hostelId as string;

        const { staffId, type, date } = body;
        if (!staffId || !type) return NextResponse.json({ error: "staffId and type required" }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });

        const now = new Date();
        // Prevent UTC shifting bugs by using the exact local timezone date provided by the browser
        const dateStr = date || now.toLocaleDateString("en-CA", { timeZone: 'Asia/Kolkata' }); // YYYY-MM-DD

        const updatePayload: any = {};
        if (type === "checkIn") updatePayload.checkInTime = now;
        if (type === "checkOut") updatePayload.checkOutTime = now;

        const record = await HostelStaffAttendance.findOneAndUpdate(
            { hostelId, staffId, date: dateStr },
            { $set: updatePayload },
            { returnDocument: 'after', upsert: true }
        ).lean();

        return NextResponse.json(record, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    } catch (error: any) {
        console.error("[POST /api/hostel/staff/attendance]", error);
        return NextResponse.json({ error: error?.message || "Server error" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}
