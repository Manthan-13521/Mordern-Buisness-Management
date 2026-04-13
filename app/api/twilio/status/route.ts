import { NextResponse } from "next/server";
import { resolveUser, AuthUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";

import { Pool } from "@/models/Pool";

export const dynamic = "force-dynamic";

/**
 * GET /api/twilio/status
 * Returns Twilio connection status for the authenticated pool.
 * NEVER returns the auth token or encrypted data.
 */
export async function GET(req: Request) {
    try {
        const [, user] = await Promise.all([dbConnect(), resolveUser(req)]);

        if (!user || user.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        const pool = await Pool.findOne({ poolId: user.poolId })
            .select("isTwilioConnected twilio.sid twilio.whatsappNumber")
            .lean() as any;

        if (!pool) {
            return NextResponse.json({ error: "Pool not found" }, {  status: 404 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        return NextResponse.json({
            isTwilioConnected: pool.isTwilioConnected ?? false,
            sid: pool.twilio?.sid ?? null,
            whatsappNumber: pool.twilio?.whatsappNumber ?? null,
        }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    } catch (error) {
        console.error("[GET /api/twilio/status]", error);
        return NextResponse.json({ error: "Internal server error" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}
