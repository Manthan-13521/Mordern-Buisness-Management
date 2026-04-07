import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { getToken } from "next-auth/jwt";
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
        const [token] = await Promise.all([getToken({ req: req as any }), dbConnect()]);
        if (!token || token.role !== "hostel_admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
                return NextResponse.json({ data: [], total: 0, page, limit });
            }
        }

        if (search) {
            filter.$or = [
                { name:    { $regex: search, $options: "i" } },
                { staffId: { $regex: search, $options: "i" } },
                { phone:   { $regex: search, $options: "i" } },
            ];
        }

        const [data, total] = await Promise.all([
            HostelStaff.find(filter)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            HostelStaff.countDocuments(filter),
        ]);

        return NextResponse.json({ data, total, page, limit });
    } catch (error) {
        console.error("[GET /api/hostel/staff]", error);
        return NextResponse.json({ error: "Failed to fetch staff" }, { status: 500 });
    }
}

// POST /api/hostel/staff
export async function POST(req: NextRequest) {
    try {
        const [token, body] = await Promise.all([getToken({ req: req as any }), req.json()]);
        await dbConnect();
        if (!token || token.role !== "hostel_admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const hostelId = token.hostelId as string;

        const { name, phone, role, blockName: rawBlockName } = body;
        if (!name || !role) return NextResponse.json({ error: "name and role are required" }, { status: 400 });

        // Resolve block (required for new submissions; optional for backward compat)
        let blockId: any = undefined;
        let blockName: string | undefined = undefined;
        if (rawBlockName && rawBlockName !== "") {
            const blockObj = await HostelBlock.findOne({ hostelId, name: rawBlockName }).lean() as any;
            if (!blockObj) return NextResponse.json({ error: `Block "${rawBlockName}" not found` }, { status: 404 });
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

        return NextResponse.json(staff, { status: 201 });
    } catch (error: any) {
        console.error("[POST /api/hostel/staff]", error);
        return NextResponse.json({ error: error?.message || "Server error" }, { status: 500 });
    }
}

// DELETE /api/hostel/staff
export async function DELETE(req: NextRequest) {
    try {
        const [token] = await Promise.all([getToken({ req: req as any }), dbConnect()]);
        if (!token || token.role !== "hostel_admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const hostelId = token.hostelId as string;

        const { searchParams } = new URL(req.url);
        const staffId = searchParams.get("staffId");

        if (!staffId) return NextResponse.json({ error: "staffId is required" }, { status: 400 });

        const deletedStaff = await HostelStaff.findOneAndUpdate(
            { staffId, hostelId },
            { $set: { isActive: false } },
            { returnDocument: "after" }
        );

        if (!deletedStaff) return NextResponse.json({ error: "Staff not found" }, { status: 404 });

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error("[DELETE /api/hostel/staff]", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
