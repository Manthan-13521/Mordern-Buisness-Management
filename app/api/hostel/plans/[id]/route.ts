import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { HostelPlan } from "@/models/HostelPlan";
import { resolveUser, AuthUser } from "@/lib/authHelper";
export const dynamic = "force-dynamic";

// PUT /api/hostel/plans/[id]
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await resolveUser(req);
        await dbConnect();
        const [{ id }, body] = await Promise.all([params, req.json()]);
        await dbConnect();
        if (!user || user.role !== "hostel_admin") return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        const hostelId = user.hostelId as string;

        const { name, durationDays, price, description, enableWhatsApp, messages, isActive } = body;
        const plan = await HostelPlan.findOneAndUpdate(
            { _id: id, hostelId },
            { $set: { name, durationDays: Number(durationDays), price: Number(price), description, enableWhatsAppAlerts: !!enableWhatsApp, messages, isActive } },
            { returnDocument: 'after' }
        ).lean();
        if (!plan) return NextResponse.json({ error: "Plan not found" }, {  status: 404 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        return NextResponse.json(plan, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    } catch (error) {
        console.error("[PUT /api/hostel/plans/[id]]", error);
        return NextResponse.json({ error: "Server error" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}

// DELETE /api/hostel/plans/[id]
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await resolveUser(req);
        await dbConnect();
        const [{ id }] = await Promise.all([params]);
        await dbConnect();
        if (!user || user.role !== "hostel_admin") return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        const hostelId = user.hostelId as string;

        const plan = await HostelPlan.findOneAndDelete({ _id: id, hostelId }).lean();
        if (!plan) return NextResponse.json({ error: "Plan not found" }, {  status: 404 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    } catch (error) {
        console.error("[DELETE /api/hostel/plans/[id]]", error);
        return NextResponse.json({ error: "Server error" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}
