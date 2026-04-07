import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { getToken } from "next-auth/jwt";
import { Hostel } from "@/models/Hostel";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    try {
        const [token] = await Promise.all([getToken({ req: req as any }), dbConnect()]);
        if (!token || token.role !== "hostel_admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const hostelId = token.hostelId as string;

        const hostel = await Hostel.findOne({ hostelId })
            .select("isTwilioConnected twilio.whatsappNumber twilio.sid")
            .lean() as any;
        if (!hostel) return NextResponse.json({ error: "Hostel not found" }, { status: 404 });

        return NextResponse.json({
            connected: hostel.isTwilioConnected ?? false,
            whatsappNumber: hostel.twilio?.whatsappNumber || null,
            sid: hostel.twilio?.sid || null,
        });
    } catch (error) {
        console.error("[GET /api/hostel/twilio/status]", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
