import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { Hostel } from "@/models/Hostel";
import { resolveUser, AuthUser } from "@/lib/authHelper";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    try {
        const user = await resolveUser(req);
        await dbConnect();

        if (!user || user.role !== "hostel_admin") return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        const hostelId = user.hostelId as string;

        await Hostel.findOneAndUpdate(
            { hostelId },
            { $unset: { twilio: 1 }, $set: { isTwilioConnected: false } }
        );
        return NextResponse.json({ success: true, message: "Twilio disconnected." }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    } catch (error) {
        console.error("[POST /api/hostel/twilio/disconnect]", error);
        return NextResponse.json({ error: "Server error" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}
