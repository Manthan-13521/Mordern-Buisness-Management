import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { UnifiedUser } from "@/models/UnifiedUser";
import { verifyQStashSignature } from "@/lib/verifyQStash";
import { checkTenantMutability } from "@/lib/subscriptionGuard";
import { requestContext } from "@/lib/requestContext";

/**
 * QStash Worker Endpoint for Dual-Write Synchronization.
 * Called asynchronously when the primary sync hook fails.
 */
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
            const authErr = await verifyQStashSignature(req);
    if (authErr) return authErr;
    try {
            // QStash payload parsing
            const body = await req.json();
            const { memberId, type, data: doc } = body;

            if (!memberId || !doc) {
                return NextResponse.json({ error: "Missing memberId or doc payload" }, { status: 400 });
            }

            await dbConnect();

            // Perform the sync logic
            const orgId = type === "hostel" ? doc.hostelId : (doc.organizationId || doc.poolId);
            let accessState = doc.accessState || "active";
            
            // Match hostel blocking logic
            if (type === "hostel" && doc.balance && doc.balance > 0 && doc.status === "active") {
                accessState = "blocked";
            }

            // ── SUBSCRIPTION LOCKDOWN CHECK ──
            const canMutate = await checkTenantMutability(orgId, type as "pool" | "hostel" | "business");
            if (!canMutate) {
                console.warn(`[QStash Worker] Skipped sync for locked/read-only tenant: ${orgId} (${type})`);
                return NextResponse.json({ success: true, message: "Skipped locked tenant" });
            }

            await UnifiedUser.findOneAndUpdate(
                { originalId: doc._id || memberId },
                {
                    $set: {
                        organizationId: orgId,
                        name: doc.name,
                        phone: doc.phone,
                        type: type,
                        accessState: accessState,
                        cachedBalance: doc.balance || doc.cachedBalance || 0,
                    }
                },
                { upsert: true, new: true }
            );

            return NextResponse.json({ success: true, message: "Sync processed via QStash" });
        } catch (error: any) {
            console.error("[QStash Worker] Sync failed:", error);
            // Returning 500 triggers QStash exponential backoff retry automatically
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
        });
            
}
