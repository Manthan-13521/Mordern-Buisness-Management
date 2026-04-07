import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { processIndividualBilling } from "@/lib/billingEngine";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

/**
 * ── Billing Worker API (Prompt 2.2) ──
 * Consumes a single subscription ID from the queue and processes it.
 * Atomic, transaction-aware, and scale-safe.
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { subscriptionId } = body;

        if (!subscriptionId) {
            return NextResponse.json({ error: "Missing subscriptionId" }, { status: 400 });
        }

        await dbConnect();
        
        const { Subscription } = await import("@/models/Subscription");
        const sub = await Subscription.findById(subscriptionId);
        
        if (!sub) {
            return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
        }

        const success = await processIndividualBilling(sub);

        if (!success) {
            console.error(`[Worker] Billing failed for sub: ${subscriptionId}`);
            return NextResponse.json({ error: "Billing process failed" }, { status: 500 });
        }

        return NextResponse.json({ success: true, memberId: sub.memberId });
    } catch (e: any) {
        console.error("[Worker] Critical Billing Error:", e);
        return NextResponse.json({ error: e.message || "Internal Worker Error" }, { status: 500 });
    }
}
