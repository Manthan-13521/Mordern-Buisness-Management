import { NextResponse } from "next/server";
import { verifyQStashSignature } from "@/lib/verifyQStash";
import { requestContext } from "@/lib/requestContext";

export const dynamic = "force-dynamic";

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
        });
            
}
