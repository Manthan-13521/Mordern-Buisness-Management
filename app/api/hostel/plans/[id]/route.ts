import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { getToken } from "next-auth/jwt";
import { HostelPlan } from "@/models/HostelPlan";

export const dynamic = "force-dynamic";

// PUT /api/hostel/plans/[id]
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const [token, { id }, body] = await Promise.all([getToken({ req: req as any }), params, req.json()]);
        await dbConnect();
        if (!token || token.role !== "hostel_admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const hostelId = token.hostelId as string;

        const { name, durationDays, price, description, enableWhatsApp, messages, isActive } = body;
        const plan = await HostelPlan.findOneAndUpdate(
            { _id: id, hostelId },
            { $set: { name, durationDays: Number(durationDays), price: Number(price), description, enableWhatsAppAlerts: !!enableWhatsApp, messages, isActive } },
            { returnDocument: 'after' }
        ).lean();
        if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });
        return NextResponse.json(plan);
    } catch (error) {
        console.error("[PUT /api/hostel/plans/[id]]", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

// DELETE /api/hostel/plans/[id]
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const [token, { id }] = await Promise.all([getToken({ req: req as any }), params]);
        await dbConnect();
        if (!token || token.role !== "hostel_admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const hostelId = token.hostelId as string;

        const plan = await HostelPlan.findOneAndDelete({ _id: id, hostelId }).lean();
        if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[DELETE /api/hostel/plans/[id]]", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
