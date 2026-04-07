import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { getToken } from "next-auth/jwt";
import { HostelStaff } from "@/models/HostelStaff";

export const dynamic = "force-dynamic";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const [token, { id }, body] = await Promise.all([getToken({ req: req as any }), params, req.json()]);
        await dbConnect();
        if (!token || token.role !== "hostel_admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const hostelId = token.hostelId as string;

        const { name, phone, role, salary, isActive } = body;
        const staff = await HostelStaff.findOneAndUpdate(
            { _id: id, hostelId },
            { $set: { name, phone, role, salary: Number(salary) || 0, isActive } },
            { returnDocument: 'after' }
        ).lean();
        if (!staff) return NextResponse.json({ error: "Staff not found" }, { status: 404 });
        return NextResponse.json(staff);
    } catch (error) {
        console.error("[PUT /api/hostel/staff/[id]]", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const [token, { id }] = await Promise.all([getToken({ req: req as any }), params]);
        await dbConnect();
        if (!token || token.role !== "hostel_admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const hostelId = token.hostelId as string;

        await HostelStaff.findOneAndUpdate({ _id: id, hostelId }, { $set: { isActive: false } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[DELETE /api/hostel/staff/[id]]", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
