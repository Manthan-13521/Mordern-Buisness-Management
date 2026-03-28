import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Pool } from "@/models/Pool";

export const dynamic = "force-dynamic";

/**
 * GET /api/twilio/status
 * Returns Twilio connection status for the authenticated pool.
 * NEVER returns the auth token or encrypted data.
 */
export async function GET() {
    try {
        const [, session] = await Promise.all([dbConnect(), getServerSession(authOptions)]);

        if (!session?.user || session.user.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const pool = await Pool.findOne({ poolId: session.user.poolId })
            .select("isTwilioConnected twilio.sid twilio.whatsappNumber")
            .lean() as any;

        if (!pool) {
            return NextResponse.json({ error: "Pool not found" }, { status: 404 });
        }

        return NextResponse.json({
            isTwilioConnected: pool.isTwilioConnected ?? false,
            sid: pool.twilio?.sid ?? null,
            whatsappNumber: pool.twilio?.whatsappNumber ?? null,
        });
    } catch (error) {
        console.error("[GET /api/twilio/status]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
