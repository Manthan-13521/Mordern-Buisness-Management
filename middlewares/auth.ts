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
    "/api/hostel/",
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
    "/api/referral",
    "/api/warmup",
    "/api/health",
    "/api/cron",
    "/api/pool/register",
    "/api/hostel/register",
    "/api/business/register",
];

export function withAuthRouting(req: NextRequestWithAuth): NextResponse | undefined {
    // ── LOAD TEST BYPASS ──────────────────────────────────────────────────
    // Skip all auth/subscription/tenant guards for load test requests (secret header required).
    if (
        process.env.LOAD_TEST === "true" &&
        req.headers.get("x-load-test-secret") === process.env.LOAD_TEST_SECRET
    ) {
        return undefined; // pass through — resolveUser() handles the synthetic user
    }

    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // ── API Subscription Guard ──
    if (path.startsWith("/api/")) {
        const isProtectedApi = SUBSCRIPTION_PROTECTED_APIS.some((p) => path.startsWith(p));
        const isAlwaysAllowed = SUBSCRIPTION_ALWAYS_ALLOW.some((p) => path.startsWith(p));
        const subStatus = (token as any)?.subscriptionStatus;
        const httpMethod = req.method?.toUpperCase() || "GET";
        const isReadOnly = httpMethod === "GET" || httpMethod === "HEAD" || httpMethod === "OPTIONS";

        if (
            isProtectedApi &&
            !isAlwaysAllowed &&
            token?.role !== "superadmin" &&
            token?.role !== "operator"
        ) {
            // SUSPENDED: Hard block all access (abuse/manual block — not just payment expiry)
            if (subStatus === "suspended") {
                console.warn(`[Middleware] API suspended block: ${path}`, {
                    userId: token?.id, status: subStatus, role: token?.role
                });
                const res = NextResponse.json(
                    { error: "Account suspended. Contact support.", code: "ACCOUNT_SUSPENDED" },
                    { status: 403 }
                );
                applySecurityHeaders(res);
                return res;
            }

            // EXPIRED: Allow read-only (GET/HEAD), block mutating methods (POST/PUT/PATCH/DELETE)
            if (subStatus === "expired") {
                if (!isReadOnly) {
                    console.warn(`[Middleware] API expired write block: ${httpMethod} ${path}`, {
                        userId: token?.id, status: subStatus, role: token?.role
                    });
                    const res = NextResponse.json(
                        {
                            error: "Subscription expired. Renew to perform this action.",
                            code: "SUBSCRIPTION_EXPIRED",
                        },
                        { status: 403 }
                    );
                    applySecurityHeaders(res);
                    return res;
                }
                // GET/HEAD for expired: allow through (read-only dashboard)
            }

            // NONE / CANCELLED: Block all access — user never had or cancelled subscription
            if (!subStatus || subStatus === "none" || subStatus === "cancelled") {
                console.warn(`[Middleware] API no-subscription block: ${path}`, {
                    userId: token?.id, status: subStatus, role: token?.role
                });
                const res = NextResponse.json(
                    {
                        error: "No active subscription. Please select a plan.",
                        code: "SUBSCRIPTION_REQUIRED",
                    },
                    { status: 403 }
                );
                applySecurityHeaders(res);
                return res;
            }
        }

        // ── Fast-Fail Tenant API Edge Guard ──
        // Ensure non-superadmin API users have at least ONE tenant scope.
        // Pool users need poolId, hostel users need hostelId, business users need businessId.
        if (
            !isAlwaysAllowed &&
            !path.startsWith("/api/hostel") &&
            !path.startsWith("/api/business") &&
            token?.role !== "superadmin" &&
            !token?.poolId &&
            !(token as any)?.hostelId &&
            !(token as any)?.businessId
        ) {
             console.error(`[Middleware] SECURITY BLOCK: No tenant ID on ${path}`, {
                 userId: token?.id, role: token?.role,
                 poolId: token?.poolId, hostelId: (token as any)?.hostelId, businessId: (token as any)?.businessId
             });
             const res = NextResponse.json(
                 { error: "No tenant assigned to session. Please complete registration." },
                 { status: 401 }
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

    // ── Subscription page guard (admin pages) ──
    const isAdminPage = /^\/pool\/[^/]+\/admin(\/|$)/.test(path) || path.startsWith("/hostel/") || path.startsWith("/business/");
    const isPublicPage = ["/select-plan", "/renew-plan", "/login", "/subscribe", "/api"].some(
        (p) => path.startsWith(p)
    );
    const subStatus = (token as any)?.subscriptionStatus;
    if (
        isAdminPage &&
        !isPublicPage &&
        token?.role !== "superadmin" &&
        token?.role !== "operator"
    ) {
        // SUSPENDED: Hard redirect to renew (abuse/manual block)
        if (subStatus === "suspended") {
            console.warn(`[Middleware] Page suspended redirect → /renew-plan`, {
                userId: token?.id, status: subStatus, path
            });
            const res = NextResponse.redirect(new URL("/renew-plan", req.url));
            applySecurityHeaders(res);
            return res;
        }
        // EXPIRED: Allow through — dashboard shows in read-only mode.
        // SubscriptionBanner handles the UI warning + renewal CTA.
        // (Do NOT redirect to /renew-plan — users need to see their data)

        // NONE / CANCELLED: Never subscribed → select plan page
        if (!subStatus || subStatus === "none" || subStatus === "cancelled") {
            console.warn(`[Middleware] Page subscription redirect → /select-plan`, {
                userId: token?.id, status: subStatus, path
            });
            const res = NextResponse.redirect(new URL("/select-plan", req.url));
            applySecurityHeaders(res);
            return res;
        }
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
