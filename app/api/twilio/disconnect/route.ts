import { NextResponse } from "next/server";
import { resolveUser, AuthUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";

import { Pool } from "@/models/Pool";
import { requestContext } from "@/lib/requestContext";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/twilio/disconnect
 * Removes Twilio credentials from this pool and sets isTwilioConnected = false.
 */
export async function DELETE(req: Request) {

        const requestId = req ? (req.headers.get("x-request-id") || crypto.randomUUID()) : crypto.randomUUID();
        const clientIp = req ? (req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown") : "unknown";
        const routePath = req ? new URL(req.url).pathname : "unknown";
        const requestMethod = "DELETE";

        return requestContext.run({
            requestId,
            ip: clientIp,
            route: routePath,
            method: requestMethod,
            startTime: Date.now()
        }, async () => {
            try {
            const [, user] = await Promise.all([dbConnect(), resolveUser(req)]);

            if (!user || user.role !== "admin") {
                return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
            }

            const pool = await Pool.findOneAndUpdate(
                { poolId: user.poolId },
                {
                    $unset: { twilio: "" },
                    $set: { isTwilioConnected: false },
                },
                { returnDocument: 'after' }
            );

            if (!pool) {
                return NextResponse.json({ error: "Pool not found" }, {  status: 404 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
            }

            return NextResponse.json({
                success: true,
                message: "Twilio disconnected. Credentials removed.",
            }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        } catch (error) {
            console.error("[DELETE /api/twilio/disconnect]", error);
            return NextResponse.json({ error: "Internal server error" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }
        });
            
}
