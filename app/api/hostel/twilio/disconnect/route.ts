import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { getToken } from "next-auth/jwt";
import { Hostel } from "@/models/Hostel";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    try {
        const [token] = await Promise.all([getToken({ req: req as any }), dbConnect()]);
        if (!token || token.role !== "hostel_admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const hostelId = token.hostelId as string;

        await Hostel.findOneAndUpdate(
            { hostelId },
            { $unset: { twilio: 1 }, $set: { isTwilioConnected: false } }
        );
        return NextResponse.json({ success: true, message: "Twilio disconnected." });
    } catch (error) {
        console.error("[POST /api/hostel/twilio/disconnect]", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
