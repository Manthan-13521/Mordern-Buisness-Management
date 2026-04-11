import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { getToken } from "next-auth/jwt";
import { HostelPlan } from "@/models/HostelPlan";

export const dynamic = "force-dynamic";

// GET /api/hostel/plans — list all plans for this hostel
export async function GET(req: Request) {
    try {
        const [token] = await Promise.all([getToken({ req: req as any }), dbConnect()]);
        if (!token || token.role !== "hostel_admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const hostelId = token.hostelId as string;
        if (!hostelId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        const plans = await HostelPlan.find({ hostelId }).sort({ price: 1 }).lean();
        return NextResponse.json({ data: plans }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    } catch (error) {
        console.error("[GET /api/hostel/plans]", error);
        return NextResponse.json({ error: "Failed to fetch plans" }, { status: 500 });
    }
}

// POST /api/hostel/plans — create a plan
export async function POST(req: Request) {
    try {
        const [token, body] = await Promise.all([getToken({ req: req as any }), req.json()]);
        await dbConnect();
        if (!token || token.role !== "hostel_admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const hostelId = token.hostelId as string;
        if (!hostelId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        const { name, durationDays, price, description, enableWhatsApp, messages } = body;
        if (!name || !durationDays || price === undefined) {
            return NextResponse.json({ error: "name, durationDays, and price are required" }, { status: 400 });
        }

        const plan = await HostelPlan.create({
            hostelId,
            name,
            durationDays: Number(durationDays),
            price: Number(price),
            description,
            enableWhatsAppAlerts: !!enableWhatsApp,
            messages,
            isActive: true,
        });
        return NextResponse.json(plan, { status: 201 });
    } catch (error: any) {
        console.error("[POST /api/hostel/plans]", error);
        return NextResponse.json({ error: error?.message || "Server error" }, { status: 500 });
    }
}
