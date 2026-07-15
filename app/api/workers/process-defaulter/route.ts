import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { resolveDefaulterState } from "@/lib/defaulterEngine";
import { verifyQStashSignature } from "@/lib/verifyQStash";
import { requestContext } from "@/lib/requestContext";

export const dynamic = "force-dynamic";

/**
 * ── Defaulter Worker API (Prompt 2.3) ──
 * Consumes a single memberId from the queue and computes defaulter state.
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
            const body = await req.json();
            const { memberId } = body;

            if (!memberId) {
                return NextResponse.json({ error: "Missing memberId" }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
            }

            await dbConnect();
            
            const { Member } = await import("@/models/Member");
            const member = await Member.findById(memberId);
            
            if (!member) {
                return NextResponse.json({ error: "Member not found" }, {  status: 404 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
            }

            // 1. Check overdue status using existing logic
            const state = await resolveDefaulterState(memberId, member.poolId);
            
            // 2. Update Access State & Cache securely based on the computed state
            const isBlocked = state.defaulterStatus === "blocked";
            await Member.updateOne(
                { _id: memberId },
                { 
                    $set: { 
                        accessState: isBlocked ? "blocked" : "active",
                        accessStatus: isBlocked ? "blocked" : "active",
                    } 
                }
            );

            return NextResponse.json({ success: true, memberId, state }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        } catch (e: any) {
            console.error("[Worker] Critical Defaulter Error:", e);
            return NextResponse.json({ error: e.message || "Internal Worker Error" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }
        });
            
}
