import { NextResponse } from "next/server";
import { resolveUser, AuthUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";
import { getEcosystemSnapshot } from "@/lib/services/analyticsService";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    try {
        const user = await resolveUser(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        if (user.role !== "superadmin") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await dbConnect();

        // ── Single Source of Truth: use the centralized analytics service ──
        const snapshot = await getEcosystemSnapshot();

        return NextResponse.json(snapshot.timeline, {
            headers: { "Cache-Control": "private, max-age=60, must-revalidate" }
        });
    } catch (e) {
        console.error("[Dashboard Chart API]", e);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
