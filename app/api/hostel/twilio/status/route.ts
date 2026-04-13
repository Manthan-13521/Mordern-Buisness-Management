import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { getToken } from "next-auth/jwt";
import { jwtVerify } from "jose";
import { Hostel } from "@/models/Hostel";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    try {
                const authHeader = req.headers.get("authorization");
        let token = null;

        if (authHeader?.startsWith("Bearer ")) {
            try {
                const bearerToken = authHeader.split(" ")[1];
                const secret = new TextEncoder().encode(process.env.JWT_SECRET);
                const { payload } = await jwtVerify(bearerToken, secret);
                token = payload;
            } catch (e) {}
        }

        if (!token) {
            token = await getToken({ req: req as any });
        }

        await dbConnect();

        if (!token || token.role !== "hostel_admin") return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        const hostelId = token.hostelId as string;

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
