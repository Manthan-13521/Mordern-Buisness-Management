import { NextResponse } from "next/server";
import { verifyQStashSignature } from "@/lib/verifyQStash";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    // ── QStash Signature Verification (Phase 2A FIX 1) ──
    const authErr = await verifyQStashSignature(req);
    if (authErr) return authErr;

    try {
        const body = await req.json();
        // Hook existing notificationEngine processing
        const { sendPaymentConfirmation } = await import("@/lib/notificationEngine");
        
        const { type, payload } = body;

        switch (type) {
            case "payment":
                await sendPaymentConfirmation(payload);
                break;
            default:
                return NextResponse.json({ error: "Unknown notification type" }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    } catch (e: any) {
        console.error("[Worker] Critical Notification Error:", e);
        return NextResponse.json({ error: e.message || "Internal Worker Error" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}
