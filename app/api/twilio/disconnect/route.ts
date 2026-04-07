import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Pool } from "@/models/Pool";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/twilio/disconnect
 * Removes Twilio credentials from this pool and sets isTwilioConnected = false.
 */
export async function DELETE() {
    try {
        const [, session] = await Promise.all([dbConnect(), getServerSession(authOptions)]);

        if (!session?.user || session.user.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const pool = await Pool.findOneAndUpdate(
            { poolId: session.user.poolId },
            {
                $unset: { twilio: "" },
                $set: { isTwilioConnected: false },
            },
            { returnDocument: 'after' }
        );

        if (!pool) {
            return NextResponse.json({ error: "Pool not found" }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            message: "Twilio disconnected. Credentials removed.",
        });
    } catch (error) {
        console.error("[DELETE /api/twilio/disconnect]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
