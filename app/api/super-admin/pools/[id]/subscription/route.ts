import { NextResponse } from "next/server";
import { resolveUser, AuthUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";
import { Pool } from "@/models/Pool";
import { requestContext } from "@/lib/requestContext";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/super-admin/pools/[id]/subscription
 * Toggles a pool's subscriptionStatus between "active" and "paused".
 */
export async function PATCH(
  req: Request, 
  { params }: { params: Promise<{ id: string }> }
) {

        const requestId = req ? (req.headers.get("x-request-id") || crypto.randomUUID()) : crypto.randomUUID();
        const clientIp = req ? (req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown") : "unknown";
        const routePath = req ? new URL(req.url).pathname : "unknown";
        const requestMethod = "PATCH";

        return requestContext.run({
            requestId,
            ip: clientIp,
            route: routePath,
            method: requestMethod,
            startTime: Date.now()
        }, async () => {
            try {
            await dbConnect();

            const user = await resolveUser(req);
            if (!user || user.role !== "superadmin") {
                return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
            }

            const body = await req.json();
            const { status } = body;

            if (status !== "active" && status !== "paused") {
                return NextResponse.json({ error: "Invalid status value" }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
            }

            const pId = await params;
            const pool = await Pool.findOneAndUpdate(
                { poolId: pId.id },
                { $set: { subscriptionStatus: status } },
                { returnDocument: 'after' }
            );

            if (!pool) {
                return NextResponse.json({ error: "Pool not found" }, {  status: 404 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
            }

            return NextResponse.json({ success: true, pool }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        } catch (error) {
            console.error("[PATCH /api/super-admin/pools/[id]/subscription]", error);
            return NextResponse.json({ error: "Failed to update pool subscription" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }
        });
            
}
