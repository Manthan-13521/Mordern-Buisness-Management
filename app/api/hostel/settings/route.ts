import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { getToken } from "next-auth/jwt";
import { Hostel } from "@/models/Hostel";

export const dynamic = "force-dynamic";

// GET /api/hostel/settings — general hostel settings (WhatsApp, Twilio status, etc.)
export async function GET(req: Request) {
    try {
        const [token] = await Promise.all([getToken({ req: req as any }), dbConnect()]);
        if (!token || token.role !== "hostel_admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const hostelId = token.hostelId as string;

        const hostel = await Hostel.findOne({ hostelId })
            .select("hostelName slug city adminEmail adminPhone numberOfBlocks isTwilioConnected plan subscriptionStatus subscriptionEndsAt")
            .lean() as any;
        if (!hostel) return NextResponse.json({ error: "Hostel not found" }, { status: 404 });

        return NextResponse.json(hostel, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    } catch (error) {
        console.error("[GET /api/hostel/settings]", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

// PUT /api/hostel/settings — update basic settings
export async function PUT(req: Request) {
    try {
        const [token, body] = await Promise.all([getToken({ req: req as any }), req.json()]);
        await dbConnect();
        if (!token || token.role !== "hostel_admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const hostelId = token.hostelId as string;

        const { hostelName, city, adminPhone } = body;
        const hostel = await Hostel.findOneAndUpdate(
            { hostelId },
            { $set: { hostelName, city, adminPhone } },
            { returnDocument: 'after' }
        ).select("hostelName slug city adminEmail adminPhone numberOfBlocks isTwilioConnected").lean();
        if (!hostel) return NextResponse.json({ error: "Hostel not found" }, { status: 404 });
        return NextResponse.json(hostel, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    } catch (error: any) {
        console.error("[PUT /api/hostel/settings]", error);
        return NextResponse.json({ error: error?.message || "Server error" }, { status: 500 });
    }
}
