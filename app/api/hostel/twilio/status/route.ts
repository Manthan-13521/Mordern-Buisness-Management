import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { Hostel } from "@/models/Hostel";
import { resolveUser, AuthUser } from "@/lib/authHelper";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    try {
        const user = await resolveUser(req);
        await dbConnect();

        if (!user || user.role !== "hostel_admin") return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        const hostelId = user.hostelId as string;

        const hostel = await Hostel.findOne({ hostelId })
            .select("isTwilioConnected twilio.whatsappNumber twilio.sid")
            .lean() as any;
        if (!hostel) return NextResponse.json({ error: "Hostel not found" }, {  status: 404 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });

        return NextResponse.json({
            connected: hostel.isTwilioConnected ?? false,
            whatsappNumber: hostel.twilio?.whatsappNumber || null,
            sid: hostel.twilio?.sid || null,
        }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    } catch (error) {
        console.error("[GET /api/hostel/twilio/status]", error);
        return NextResponse.json({ error: "Server error" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}
