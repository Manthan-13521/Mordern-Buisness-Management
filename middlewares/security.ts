import { NextResponse } from "next/server";
import type { NextRequestWithAuth } from "next-auth/middleware";
import { verifyCSRFToken } from "@/lib/csrf";

export const SECURITY_HEADERS: Record<string, string> = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    // X-XSS-Protection intentionally omitted — deprecated, can open XSS vectors in IE
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(self 'https://checkout.razorpay.com'), usb=(), interest-cohort=()",
    "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
    // Phase 2B FIX 1: HSTS — 2 year max-age with subdomains and preload
    "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
    // Phase 2B FIX 1: Content-Security-Policy
    // Allows: Razorpay checkout popup, Cloudinary/CloudFront images, Sentry error reporting,
    // Google Fonts, Vercel Insights, and inline styles/scripts (Next.js requires unsafe-inline).
    "Content-Security-Policy": [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://cdn.razorpay.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: blob: https://res.cloudinary.com https://*.cloudfront.net",
        "connect-src 'self' https://api.razorpay.com https://sentry.io https://*.sentry.io https://vitals.vercel-insights.com",
        "frame-src https://api.razorpay.com https://checkout.razorpay.com",
        "report-uri /api/csp-report",
    ].join("; "),
};

const ALLOWED_ORIGINS = new Set(
    [
        "http://localhost:3000",
        "https://localhost:3000",
        process.env.NEXTAUTH_URL || "",
        process.env.NEXT_PUBLIC_BASE_URL || "",
    ].filter(Boolean)
);

export function applyCORS(req: NextRequestWithAuth, res: NextResponse) {
    const origin = req.headers.get("origin") || "";
    // Phase 2A FIX 8: Only set CORS header when origin is present and explicitly allowed.
    // Previously fell back to "*" when no Origin header was present.
    if (origin && ALLOWED_ORIGINS.has(origin)) {
        res.headers.set("Access-Control-Allow-Origin", origin);
    }
    res.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, x-csrf-token");
    res.headers.set("Access-Control-Max-Age", "86400");
}

export function applySecurityHeaders(res: NextResponse) {
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
        res.headers.set(key, value);
    }
}

const CSRF_EXEMPT = [
    "/api/auth",
    "/api/pool/register",
    "/api/pool/scan",
    "/api/razorpay/verify",
    "/api/cron/",
    "/api/jobs/",
    "/api/seed",
    "/api/member/login",
    "/api/warmup",
    "/api/health",
    "/api/hostel/register",
    "/api/subscription/webhook",
    "/api/subscription/",
    "/api/business/register",
    "/api/csp-report",
];

export async function withSecurity(req: NextRequestWithAuth): Promise<NextResponse | undefined> {
    const method = req.method;
    const path = req.nextUrl.pathname;
    
    // 1. OPTIONS Check (CORS) -> Must return Early Response
    if (method === "OPTIONS") {
        const requestId = req.headers.get("x-request-id") || crypto.randomUUID();
        const requestHeaders = new Headers(req.headers);
        requestHeaders.set("x-request-id", requestId);
        
        const res = new NextResponse(null, { status: 204, headers: requestHeaders });
        applyCORS(req, res);
        applySecurityHeaders(res);
        return res;
    }

    // 2. Payload size check
    // Upload routes carry base64-encoded files — exempt them from the default 100KB limit.
    const LARGE_PAYLOAD_PATHS = ["/api/business/upload"];
    const isLargePayloadRoute = LARGE_PAYLOAD_PATHS.some((p) => path.startsWith(p));
    const contentLength = parseInt(req.headers.get("content-length") || "0", 10);
    const maxPayload = isLargePayloadRoute ? 8_000_000 : 100_000; // 8MB for uploads, 100KB otherwise
    if (contentLength > maxPayload) {
        const res = NextResponse.json({ error: `Payload too large. Maximum allowed size is ${isLargePayloadRoute ? '8MB' : '100KB'}.` }, { status: 413 });
        applySecurityHeaders(res);
        return res;
    }

    // 3. CSRF Verification
    const isMutating = ["POST", "PUT", "DELETE"].includes(method);
    const isExempt = CSRF_EXEMPT.some((p) => path.startsWith(p));

    if (isMutating && !isExempt) {
        const origin = req.headers.get("origin");
        const referer = req.headers.get("referer");
        const requestUrl = req.nextUrl.origin;

        let sameOrigin = false;
        if (origin) {
            sameOrigin = origin === requestUrl;
        } else if (referer) {
            try {
                sameOrigin = new URL(referer).origin === requestUrl;
            } catch { /* invalid referer */ }
        }

        const csrfToken = req.headers.get("x-csrf-token");
        if (!sameOrigin && !(await verifyCSRFToken(csrfToken || ""))) {
            const res = NextResponse.json({ error: "Invalid or missing CSRF token" }, { status: 403 });
            applySecurityHeaders(res);
            return res;
        }
    }

    return undefined; // Security passed
}
