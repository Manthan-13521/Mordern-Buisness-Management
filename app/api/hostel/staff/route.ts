import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { getToken } from "next-auth/jwt";
import { jwtVerify } from "jose";
import { HostelStaff } from "@/models/HostelStaff";
import { HostelStaffAttendance } from "@/models/HostelStaffAttendance";
import { HostelBlock } from "@/models/HostelBlock";

export const dynamic = "force-dynamic";

let _hostelStaffCounter = 0;

function generateHostelStaffId(role: string): string {
    _hostelStaffCounter++;
    const prefix = "HS";
    return `${prefix}${String(Date.now()).slice(-4)}${String(_hostelStaffCounter).padStart(2, "0")}`;
}

// GET /api/hostel/staff
export async function GET(req: NextRequest) {
    try {
                const authHeader = req.headers.get("authorization");
        let token = null;

        if (authHeader?.startsWith("Bearer ")) {
            try {
                const bearerToken = authHeader.split(" ")[1];
                const secret = new TextEncoder().encode(process.env.JWT_SECRET);
                const { payload } = await jwtVerify(bearerToken, secret);
                token = payload;
            } catch (e) {}
        }

        if (!token) {
            token = await getToken({ req: req as any });
        }

        await dbConnect();

        if (!token || token.role !== "hostel_admin") return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        const hostelId = token.hostelId as string;

        const { searchParams } = new URL(req.url);
        const page   = Math.max(1, Number(searchParams.get("page")  ?? 1));
        const limit  = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? 11)));
        const search = searchParams.get("search") ?? "";
        const block  = searchParams.get("block") ?? "";

        const filter: any = { hostelId, isActive: true };

        // Block filter
        if (block && block !== "all") {
            const blockObj = await HostelBlock.findOne({ hostelId, name: block }).lean() as any;
            if (blockObj) {
                filter.blockId = blockObj._id;
            } else {
                // Invalid block name — return empty results
                return NextResponse.json({ data: [], total: 0, page, limit }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
            }
        }

        if (search) {
            filter.$or = [
                { name:    { $regex: search, $options: "i" } },
                { staffId: { $regex: search, $options: "i" } },
                { phone:   { $regex: search, $options: "i" } },
            ];
        }

        const [rawData, total] = await Promise.all([
            HostelStaff.find(filter)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            HostelStaff.countDocuments(filter),
        ]);

        // 3-Month Attendance Calculation
        const now = new Date();
        const monthDetails: { mIdx: number; y: number; daysCount: number; label: string }[] = [];
        for (let i = 0; i < 3; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const mIdx = d.getMonth();
            const y = d.getFullYear();
            const daysCount = new Date(y, mIdx + 1, 0).getDate();
            const label = d.toLocaleDateString("en-IN", { month: "short" });
            monthDetails.push({ mIdx, y, daysCount, label });
        }

        // Determine the full range for the query
        // monthDetails is ordered [Current, Prev1, Prev2]
        const earliest = monthDetails[2];
        const latest = monthDetails[0];
        const startStr = `${earliest.y}-${String(earliest.mIdx + 1).padStart(2, "0")}-01`;
        const endStr   = `${latest.y}-${String(latest.mIdx + 1).padStart(2, "0")}-${String(latest.daysCount).padStart(2, "0")}`;

        const staffIds = rawData.map((s: any) => s.staffId);
        const attendances = await HostelStaffAttendance.find({
            hostelId,
            staffId: { $in: staffIds },
            date: { $gte: startStr, $lte: endStr },
            status: "Present"
        }).lean();

        const data = rawData.map((s: any) => {
            const history = monthDetails.map(m => {
                const count = attendances.filter((a: any) => {
                    const aDate = new Date(a.date);
                    return a.staffId === s.staffId && aDate.getMonth() === m.mIdx && aDate.getFullYear() === m.y;
                }).length;
                return {
                    label: m.label,
                    presentCount: count,
                    totalDays: m.daysCount
                };
            });
            return { ...s, attendanceHistory: history };
        });

        return NextResponse.json({ data, total, page, limit }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    } catch (error) {
        console.error("[GET /api/hostel/staff]", error);
        return NextResponse.json({ error: "Failed to fetch staff" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}

// POST /api/hostel/staff
export async function POST(req: NextRequest) {
    try {
                const authHeader = req.headers.get("authorization");
        let token = null;

        if (authHeader?.startsWith("Bearer ")) {
            try {
                const bearerToken = authHeader.split(" ")[1];
                const secret = new TextEncoder().encode(process.env.JWT_SECRET);
                const { payload } = await jwtVerify(bearerToken, secret);
                token = payload;
            } catch (e) {}
        }

        if (!token) {
            token = await getToken({ req: req as any });
        }

        await dbConnect();
        const [body] = await Promise.all([req.json()]);
        await dbConnect();
        if (!token || token.role !== "hostel_admin") return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        const hostelId = token.hostelId as string;

        const { name, phone, role, blockName: rawBlockName } = body;
        if (!name || !role) return NextResponse.json({ error: "name and role are required" }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });

        // Resolve block (required for new submissions; optional for backward compat)
        let blockId: any = undefined;
        let blockName: string | undefined = undefined;
        if (rawBlockName && rawBlockName !== "") {
            const blockObj = await HostelBlock.findOne({ hostelId, name: rawBlockName }).lean() as any;
            if (!blockObj) return NextResponse.json({ error: `Block "${rawBlockName}" not found` }, {  status: 404 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
            blockId   = blockObj._id;
            blockName = blockObj.name;
        }

        const staffId = generateHostelStaffId(role);
        const staff = await HostelStaff.create({
            hostelId, staffId, name: name.trim(), phone: (phone || "").trim(), role,
            isActive: true,
            ...(blockId   ? { blockId }   : {}),
            ...(blockName ? { blockName } : {}),
        });

        return NextResponse.json(staff, {  status: 201 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    } catch (error: any) {
        console.error("[POST /api/hostel/staff]", error);
        return NextResponse.json({ error: error?.message || "Server error" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}

// DELETE /api/hostel/staff
export async function DELETE(req: NextRequest) {
    try {
                const authHeader = req.headers.get("authorization");
        let token = null;

        if (authHeader?.startsWith("Bearer ")) {
            try {
                const bearerToken = authHeader.split(" ")[1];
                const secret = new TextEncoder().encode(process.env.JWT_SECRET);
                const { payload } = await jwtVerify(bearerToken, secret);
                token = payload;
            } catch (e) {}
        }

        if (!token) {
            token = await getToken({ req: req as any });
        }

        await dbConnect();

        if (!token || token.role !== "hostel_admin") return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        const hostelId = token.hostelId as string;

        const { searchParams } = new URL(req.url);
        const staffId = searchParams.get("staffId");

        if (!staffId) return NextResponse.json({ error: "staffId is required" }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });

        const deletedStaff = await HostelStaff.findOneAndUpdate(
            { staffId, hostelId },
            { $set: { isActive: false } },
            { returnDocument: "after" }
        );

        if (!deletedStaff) return NextResponse.json({ error: "Staff not found" }, {  status: 404 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });

        return NextResponse.json({ success: true }, {  status: 200 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    } catch (error) {
        console.error("[DELETE /api/hostel/staff]", error);
        return NextResponse.json({ error: "Server error" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}
