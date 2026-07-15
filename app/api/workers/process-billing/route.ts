import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { processIndividualBilling } from "@/lib/billingEngine";
import mongoose from "mongoose";
import { verifyQStashSignature } from "@/lib/verifyQStash";
import { requestContext } from "@/lib/requestContext";

export const dynamic = "force-dynamic";

/**
 * ── Billing Worker API (Prompt 2.2) ──
 * Consumes a single subscription ID from the queue and processes it.
 * Atomic, transaction-aware, and scale-safe.
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
            const { subscriptionId } = body;

            if (!subscriptionId) {
                return NextResponse.json({ error: "Missing subscriptionId" }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
            }

            await dbConnect();
            
            const { Subscription } = await import("@/models/Subscription");
            const sub = await Subscription.findById(subscriptionId);
            
            if (!sub) {
                return NextResponse.json({ error: "Subscription not found" }, {  status: 404 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
            }

            const success = await processIndividualBilling(sub);

            if (!success) {
                console.error(`[Worker] Billing failed for sub: ${subscriptionId}`);
                return NextResponse.json({ error: "Billing process failed" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
            }

            return NextResponse.json({ success: true, memberId: sub.memberId }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        } catch (e: any) {
            console.error("[Worker] Critical Billing Error:", e);
            return NextResponse.json({ error: e.message || "Internal Worker Error" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }
        });
            
}
