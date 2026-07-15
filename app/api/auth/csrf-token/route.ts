import { NextResponse } from "next/server";
import { generateCSRFToken } from "@/lib/csrf";
import { requestContext } from "@/lib/requestContext";

/**
 * GET /api/auth/csrf-token
 * Returns a signed CSRF token for the frontend to include in
 * mutating requests (POST/PUT/DELETE) via the x-csrf-token header.
 */
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
            const token = await generateCSRFToken();
    return NextResponse.json({ csrfToken: token });
        });
            
}
