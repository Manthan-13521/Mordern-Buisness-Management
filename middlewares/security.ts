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
    if (ALLOWED_ORIGINS.has(origin) || !origin) {
        res.headers.set("Access-Control-Allow-Origin", origin || "*");
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
    const contentLength = parseInt(req.headers.get("content-length") || "0", 10);
    if (contentLength > 100_000) {
        const res = NextResponse.json({ error: "Payload too large. Maximum allowed size is 100KB." }, { status: 413 });
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
