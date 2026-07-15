import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { Hostel } from "@/models/Hostel";
import { resolveUser, AuthUser } from "@/lib/authHelper";
import { requestContext } from "@/lib/requestContext";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {

        const requestId = req ? (req.headers.get("x-request-id") || crypto.randomUUID()) : crypto.randomUUID();
        const clientIp = req ? (req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown") : "unknown";
        const routePath = req ? new URL(req.url).pathname : "unknown";
        const requestMethod = "POST";

        return requestContext.run({
            requestId,
            ip: clientIp,
            route: routePath,
            method: requestMethod,
            startTime: Date.now()
        }, async () => {
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
        });
            
}
