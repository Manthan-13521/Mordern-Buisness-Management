import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { getToken } from "@/lib/universalAuth";
import { Hostel } from "@/models/Hostel";
import { encryptToken } from "@/lib/twilioService";
import twilio from "twilio";

export const dynamic = "force-dynamic";

/**
 * POST /api/hostel/twilio/connect
 * Tests Twilio credentials then saves AES-256-GCM encrypted authToken.
 */
export async function POST(req: Request) {
    try {
        const [token, body] = await Promise.all([getToken({ req: req as any }), req.json()]);
        await dbConnect();
        if (!token || token.role !== "hostel_admin") {
            return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }
        const hostelId = token.hostelId as string;

        const { sid, authToken, whatsappNumber, testPhone } = body;
        if (!sid || !authToken || !whatsappNumber || !testPhone) {
            return NextResponse.json({ error: "sid, authToken, whatsappNumber, and testPhone are required" }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        const fromNumber = whatsappNumber.startsWith("whatsapp:") ? whatsappNumber : `whatsapp:${whatsappNumber}`;
        const rawPhone = testPhone.replace(/\D/g, "");
        const toBase = rawPhone.startsWith("91") && rawPhone.length === 12 ? `+${rawPhone}` : `+91${rawPhone}`;
        const toNumber = `whatsapp:${toBase}`;

        // Step 1: Test credentials
        let testClient: twilio.Twilio;
        try {
            testClient = twilio(sid, authToken);
        } catch {
            return NextResponse.json({ error: "Invalid Twilio credentials format." }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        try {
            await testClient.messages.create({
                from: fromNumber,
                to: toNumber,
                body: "✅ WhatsApp connected successfully! Your hostel management system is now linked to this number.",
            });
        } catch (twilioErr: any) {
            return NextResponse.json({
                error: "Twilio test message failed. Credentials not saved.",
                detail: twilioErr?.message || "Unknown Twilio error",
            }, {  status: 422 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        // Step 2: Encrypt and save
        const { encrypted, iv } = encryptToken(authToken);

        const hostel = await Hostel.findOneAndUpdate(
            { hostelId },
            {
                $set: {
                    twilio: { sid, authToken_encrypted: encrypted, iv, whatsappNumber: fromNumber },
                    isTwilioConnected: true,
                },
            },
            { returnDocument: 'after' }
        ).lean();

        if (!hostel) return NextResponse.json({ error: "Hostel not found" }, {  status: 404 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });

        return NextResponse.json({ success: true, message: "Twilio connected! Test message sent.", whatsappNumber: fromNumber }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    } catch (error: any) {
        console.error("[POST /api/hostel/twilio/connect]", error);
        return NextResponse.json({ error: "Internal server error" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}
