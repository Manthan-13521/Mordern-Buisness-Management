import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { HostelStaff } from "@/models/HostelStaff";
import { resolveUser, AuthUser } from "@/lib/authHelper";
export const dynamic = "force-dynamic";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await resolveUser(req);
        await dbConnect();
        const [{ id }, body] = await Promise.all([params, req.json()]);
        await dbConnect();
        if (!user || user.role !== "hostel_admin") return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        const hostelId = user.hostelId as string;

        const { name, phone, role, salary, isActive } = body;
        const staff = await HostelStaff.findOneAndUpdate(
            { _id: id, hostelId },
            { $set: { name, phone, role, salary: Number(salary) || 0, isActive } },
            { returnDocument: 'after' }
        ).lean();
        if (!staff) return NextResponse.json({ error: "Staff not found" }, {  status: 404 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        return NextResponse.json(staff, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    } catch (error) {
        console.error("[PUT /api/hostel/staff/[id]]", error);
        return NextResponse.json({ error: "Server error" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await resolveUser(req);
        await dbConnect();
        const [{ id }] = await Promise.all([params]);
        await dbConnect();
        if (!user || user.role !== "hostel_admin") return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        const hostelId = user.hostelId as string;

        await HostelStaff.findOneAndUpdate({ _id: id, hostelId }, { $set: { isActive: false } });
        return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    } catch (error) {
        console.error("[DELETE /api/hostel/staff/[id]]", error);
        return NextResponse.json({ error: "Server error" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}
