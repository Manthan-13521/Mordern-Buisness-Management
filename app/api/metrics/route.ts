import { NextResponse } from "next/server";
import { register } from "@/lib/metrics";
import { requestContext } from "@/lib/requestContext";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {

        const requestId = req ? (req.headers.get("x-request-id") || crypto.randomUUID()) : crypto.randomUUID();
        const clientIp = req ? (req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown") : "unknown";
        const routePath = req ? new URL(req.url).pathname : "unknown";
        const requestMethod = "GET";

        return requestContext.run({
            requestId,
            ip: clientIp,
            route: routePath,
            method: requestMethod,
            startTime: Date.now()
        }, async () => {
            try {
            const metrics = await register.metrics();
            return new NextResponse(metrics, {
                status: 200,
                headers: {
                    "Content-Type": register.contentType,
                },
            });
        } catch (ex) {
            return NextResponse.json({ error: "Failed to collect metrics" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }
        });
            
}
