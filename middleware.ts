import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequestWithAuth } from "next-auth/middleware";
import { applySecurityHeaders, applyCORS, withSecurity } from "./middlewares/security";
import { withRateLimit, getIp } from "./middlewares/rateLimit";
import { withAbuse } from "./middlewares/abuse";
import { withAuthRouting } from "./middlewares/auth";

// ─── PUBLIC PATHS: exempt from session requirement ───────────────────
const PUBLIC_API_PREFIXES = [
    "/api/auth",
    "/api/seed",
    "/api/razorpay/webhook",
    "/api/subscription/webhook",
    "/api/health",
    "/api/cron",
    "/api/warmup",
    "/api/pool/register",
    "/api/hostel/register",
    "/api/business/register",
    "/api/razorpay/create-order",
    "/api/subscription/create-order",
    "/api/csp-report",
];

// ─── PUBLIC PAGE PATHS: accessible without session ───────────────────
const PUBLIC_PAGE_PATHS = [
    "/login",
    "/register",
    "/select-plan",
    "/renew-plan",
    "/subscribe",
];

export default withAuth(
    async function middleware(req: NextRequestWithAuth) {
        // 1. SECURITY (CORS, Payload Size, CSRF)
        const secRes = await withSecurity(req);
        if (secRes) return secRes;

        const path = req.nextUrl.pathname;
        const requestId = req.headers.get("x-request-id") || crypto.randomUUID();

        // 2. ABUSE & RATELIMIT (API Only)
        let rlHeaders = { limit: '50', remaining: '50' };

        // ── Load-test bypass: secret header + IP allowlist required ──────────
        // LOAD_TEST mode requires ALL of:
        //   1. LOAD_TEST=true env var
        //   2. x-load-test-secret header matching LOAD_TEST_SECRET env var
        //   3. Request IP in LOAD_TEST_ALLOWED_IPS (comma-separated)
        //   4. NOT in production (blocked at env.ts startup)
        const isLoadTest = (() => {
            if (process.env.LOAD_TEST !== "true") return false;
            if (process.env.NODE_ENV === "production") return false; // Hard block

            const secret = process.env.LOAD_TEST_SECRET;
            const headerSecret = req.headers.get("x-load-test-secret");
            if (!secret || !headerSecret || secret !== headerSecret) return false;

            const allowedIPs = (process.env.LOAD_TEST_ALLOWED_IPS || "").split(",").map(s => s.trim()).filter(Boolean);
            if (allowedIPs.length === 0) return false; // No IPs configured = no bypass
            const clientIp = getIp(req);
            return allowedIPs.includes(clientIp);
        })();

        if (path.startsWith("/api/") && !isLoadTest) {
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
            // ── FIXED: was `() => true` which bypassed all session checks ──
            // Public API paths and page paths are whitelisted; everything else requires a valid token.
            authorized: ({ token, req }) => {
                const path = req.nextUrl.pathname;

                // Always allow public API paths through without a session
                if (PUBLIC_API_PREFIXES.some((prefix) => path.startsWith(prefix))) {
                    return true;
                }

                // Always allow public page paths through without a session
                if (PUBLIC_PAGE_PATHS.some((p) => path.startsWith(p))) {
                    return true;
                }

                // Allow login sub-routes for tenant admin pages
                if (path.includes("/login")) {
                    return true;
                }

                // All other matched paths require a valid session token
                return !!token;
            },
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
