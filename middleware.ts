import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequestWithAuth } from "next-auth/middleware";
import { applySecurityHeaders, applyCORS, withSecurity } from "./middlewares/security";
import { withRateLimit, getIp } from "./middlewares/rateLimit";
import { withAbuse } from "./middlewares/abuse";
import { withAuthRouting } from "./middlewares/auth";

export default withAuth(
    async function middleware(req: NextRequestWithAuth) {
        // 1. SECURITY (CORS, Payload Size, CSRF)
        const secRes = await withSecurity(req);
        if (secRes) return secRes;

        const path = req.nextUrl.pathname;
        const requestId = req.headers.get("x-request-id") || crypto.randomUUID();

        // 2. ABUSE & RATELIMIT (API Only)
        let rlHeaders = { limit: '50', remaining: '50' };
        
        if (path.startsWith("/api/")) {
            const ip = getIp(req);
            const token = req.nextauth.token;
            const role = token?.role as string | undefined;
            const userId = (token?.id as string) || (token?.email as string) || "guest";
            const abuseKey = `${userId}:${ip}`;

            const abuseRes = await withAbuse(abuseKey, role);
            if (abuseRes) return abuseRes;

            const { res: rlRes, rl } = await withRateLimit(req, role);
            if (rl) {
                rlHeaders.limit = String(rl.limit);
                rlHeaders.remaining = String(rl.remaining);
            }
            if (rlRes) return rlRes;
        }

        // 3. AUTH & ROUTING
        // For API calls, if auth passes, we must return NextResponse.next() and attach headers
        const authRes = withAuthRouting(req);
        if (authRes) return authRes;

        // 4. HANDLER (Pass through)
        const requestHeaders = new Headers(req.headers);
        requestHeaders.set("x-request-id", requestId);
        
        const res = NextResponse.next({ request: { headers: requestHeaders } });
        res.headers.set("X-RateLimit-Limit", rlHeaders.limit);
        res.headers.set("X-RateLimit-Remaining", rlHeaders.remaining);
        res.headers.set("x-request-id", requestId);
        applySecurityHeaders(res);
        applyCORS(req, res);
        
        return res;
    },
    {
        callbacks: {
            authorized: () => true,
        },
    }
);

export const config = {
    matcher: [
        "/superadmin/:path*",
        "/pool/:poolSlug/admin/:path*",
        "/hostel/:hostelSlug/admin/:path*",
        "/business/:businessSlug/admin/:path*",
        "/api/:path*",
        "/select-plan",
        "/renew-plan",
    ],
};
