import { NextResponse } from "next/server";
import type { NextRequestWithAuth } from "next-auth/middleware";
import { applySecurityHeaders } from "./security";

// ── Role & Subscription Definitions ──
const SUBSCRIPTION_PROTECTED_APIS = [
    "/api/members",
    "/api/member/",
    "/api/payments",
    "/api/plans",
    "/api/pool/",
    "/api/hostel/"
    "/api/entry",
    "/api/analytics",
    "/api/staff",
    "/api/dashboard",
    "/api/export",
    "/api/logs",
    "/api/settings",
    "/api/notifications",
    "/api/backups",
    "/api/business/",
];

const SUBSCRIPTION_ALWAYS_ALLOW = [
    "/api/auth",
    "/api/subscription",
    "/api/warmup",
    "/api/health",
    "/api/cron",
    "/api/pool/register",
    "/api/hostel/register",
    "/api/business/register",
];

export function withAuthRouting(req: NextRequestWithAuth): NextResponse | undefined {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // ── API Subscription Guard ──
    if (path.startsWith("/api/")) {
        const isProtectedApi = SUBSCRIPTION_PROTECTED_APIS.some((p) => path.startsWith(p));
        const isAlwaysAllowed = SUBSCRIPTION_ALWAYS_ALLOW.some((p) => path.startsWith(p));

        if (
            isProtectedApi &&
            !isAlwaysAllowed &&
            token?.role !== "superadmin" &&
            (token as any)?.subscriptionStatus === "expired"
        ) {
            const res = NextResponse.json(
                {
                    error: "Subscription expired. Please renew to continue.",
                    code: "SUBSCRIPTION_EXPIRED",
                },
                { status: 403 }
            );
            applySecurityHeaders(res);
            return res;
        }
        return undefined; // Pass through to handler inside middleware.ts
    }

    // ── Super Admin page protection ──
    if (path.startsWith("/superadmin")) {
        if (path === "/superadmin/login") {
            const res = NextResponse.next();
            applySecurityHeaders(res);
            return res;
        }
        if (!token || token.role !== "superadmin") {
            return NextResponse.redirect(new URL("/login", req.url));
        }
        const res = NextResponse.next();
        applySecurityHeaders(res);
        return res;
    }

    // ── Subscription page guard ──
    const isAdminPage = /^\/pool\/[^/]+\/admin(\/|$)/.test(path) || path.startsWith("/hostel/") || path.startsWith("/business/");
    const isPublicPage = ["/select-plan", "/renew-plan", "/login", "/subscribe", "/api"].some(
        (p) => path.startsWith(p)
    );
    if (
        isAdminPage &&
        !isPublicPage &&
        token?.role !== "superadmin" &&
        (token as any)?.subscriptionStatus === "expired"
    ) {
        const res = NextResponse.redirect(new URL("/renew-plan", req.url));
        applySecurityHeaders(res);
        return res;
    }

    // ── Hostel Admin protection ──
    if (path.startsWith("/hostel/")) {
        const hostelAdminRegex = /^\/hostel\/([^/]+)\/admin(\/.*)?$/;
        const hostelMatch = path.match(hostelAdminRegex);

        if (hostelMatch) {
            const hostelSlug = hostelMatch[1];
            const subRoute = hostelMatch[2] || "";

            if (subRoute.includes("/login")) {
                const res = NextResponse.next();
                applySecurityHeaders(res);
                return res;
            }

            if (!token || token.role !== "hostel_admin") {
                return NextResponse.redirect(new URL("/login", req.url));
            }

            if (token.hostelSlug !== hostelSlug) {
                return NextResponse.redirect(new URL("/login", req.url));
            }

            const res = NextResponse.next();
            applySecurityHeaders(res);
            return res;
        }
        const res = NextResponse.next();
        applySecurityHeaders(res);
        return res;
    }

    // ── Business Admin protection ──
    if (path.startsWith("/business/")) {
        const businessAdminRegex = /^\/business\/([^/]+)\/admin(\/.*)?$/;
        const businessMatch = path.match(businessAdminRegex);

        if (businessMatch) {
            const businessSlug = businessMatch[1];
            const subRoute = businessMatch[2] || "";

            if (subRoute.includes("/login")) {
                const res = NextResponse.next();
                applySecurityHeaders(res);
                return res;
            }

            if (!token || token.role !== "business_admin") {
                return NextResponse.redirect(new URL("/login", req.url));
            }

            if (token.businessSlug !== businessSlug) {
                return NextResponse.redirect(new URL("/login", req.url));
            }

            const res = NextResponse.next();
            applySecurityHeaders(res);
            return res;
        }
        const res = NextResponse.next();
        applySecurityHeaders(res);
        return res;
    }

    // ── Pool Admin protection ──
    const poolAdminRegex = /^\/pool\/([^/]+)\/admin(\/.*)?$/;
    const match = path.match(poolAdminRegex);

    if (match) {
        const poolSlug = match[1];
        const adminSubRoute = match[2] || "";

        if (adminSubRoute.includes("/login")) {
            const res = NextResponse.next();
            applySecurityHeaders(res);
            return res;
        }

        if (!token || (token.role !== "admin" && token.role !== "operator")) {
            return NextResponse.redirect(new URL("/login", req.url));
        }

        if (token.poolSlug !== poolSlug) {
            return NextResponse.redirect(new URL("/login", req.url));
        }

        const res = NextResponse.next();
        applySecurityHeaders(res);
        return res;
    }

    const res = NextResponse.next();
    applySecurityHeaders(res);
    return res;
}
