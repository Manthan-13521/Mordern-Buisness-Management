import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Pool } from "@/models/Pool";
import { TwilioConnectSchema } from "@/lib/validators";
import { encryptToken } from "@/lib/twilioService";
import twilio from "twilio";

export const dynamic = "force-dynamic";

/**
 * POST /api/twilio/connect
 * Tests credentials by sending a WhatsApp message, then saves if successful.
 * IMPORTANT: credentials are NEVER saved if the test message fails.
 */
export async function POST(req: Request) {
    try {
        const [, session] = await Promise.all([dbConnect(), getServerSession(authOptions)]);

        if (!session?.user || session.user.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const result = TwilioConnectSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json({ error: result.error.flatten(, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } }) }, { status: 400 });
        }

        const { sid, authToken, whatsappNumber, testPhone } = result.data;

        // Normalize the from/to numbers
        const fromNumber = whatsappNumber.startsWith("whatsapp:")
            ? whatsappNumber
            : `whatsapp:${whatsappNumber}`;

        const rawPhone = testPhone.replace(/\D/g, "");
        const toBase = rawPhone.startsWith("91") && rawPhone.length === 12
            ? `+${rawPhone}`
            : `+91${rawPhone}`;
        const toNumber = `whatsapp:${toBase}`;

        // ── Step 1: Test credentials by sending a real message ────────────
        let testClient: twilio.Twilio;
        try {
            testClient = twilio(sid, authToken);
        } catch {
            return NextResponse.json(
                { error: "Invalid Twilio credentials format." },
                { status: 400 }
            );
        }

        try {
            await testClient.messages.create({
                from: fromNumber,
                to: toNumber,
                body: "✅ WhatsApp connected successfully! Your pool management system is now linked to this number.",
            });
        } catch (twilioErr: any) {
            // Do NOT save credentials on failure
            return NextResponse.json(
                {
                    error: "Twilio test message failed. Credentials not saved.",
                    detail: twilioErr?.message || "Unknown Twilio error",
                },
                { status: 422 }
            );
        }

        // ── Step 2: Encrypt and save ──────────────────────────────────────
        const { encrypted, iv } = encryptToken(authToken);

        const pool = await Pool.findOneAndUpdate(
            { poolId: session.user.poolId },
            {
                $set: {
                    twilio: {
                        sid,
                        authToken_encrypted: encrypted,
                        iv,
                        whatsappNumber: fromNumber,
                    },
                    isTwilioConnected: true,
                },
            },
            { returnDocument: 'after' }
        );

        if (!pool) {
            return NextResponse.json({ error: "Pool not found" }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            message: "Twilio connected! Test message sent successfully.",
            whatsappNumber: fromNumber,
        });
    } catch (error: any) {
        console.error("[POST /api/twilio/connect]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
