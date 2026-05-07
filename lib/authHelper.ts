import { jwtVerify } from "jose";
import { getToken } from "next-auth/jwt";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * Normalized user object returned from any auth source.
 * This is the single, canonical user type used across all API routes.
 */
export interface AuthUser {
    id: string;
    role: string;
    email?: string;
    name?: string;
    // Pool tenant
    poolId?: string;
    poolSlug?: string;
    poolName?: string;
    // Hostel tenant
    hostelId?: string;
    hostelSlug?: string;
    hostelName?: string;
    // Business tenant
    businessId?: string;
    businessSlug?: string;
    businessName?: string;
    // Subscription
    subscriptionStatus?: "active" | "expired" | "none";
    subscriptionExpiryDate?: string | null;
}

/**
 * Reads and normalizes a raw payload from either JWTPayload (jose) or 
 * NextAuth token/session into a consistent AuthUser shape.
 * Returns null if no meaningful user can be extracted.
 */
function normalizeRawPayload(raw: Record<string, unknown> | null | undefined): AuthUser | null {
    if (!raw) return null;

    const id = (raw.id ?? raw.sub) as string | undefined;
    if (!id) return null;

    return {
        id,
        role: (raw.role as string) ?? "",
        email: raw.email as string | undefined,
        name: raw.name as string | undefined,
        poolId: raw.poolId as string | undefined,
        poolSlug: raw.poolSlug as string | undefined,
        poolName: raw.poolName as string | undefined,
        hostelId: raw.hostelId as string | undefined,
        hostelSlug: raw.hostelSlug as string | undefined,
        hostelName: raw.hostelName as string | undefined,
        businessId: raw.businessId as string | undefined,
        businessSlug: raw.businessSlug as string | undefined,
        businessName: raw.businessName as string | undefined,
        subscriptionStatus: raw.subscriptionStatus as AuthUser["subscriptionStatus"],
        subscriptionExpiryDate: raw.subscriptionExpiryDate as string | null | undefined,
    };
}

/**
 * Resolves the authenticated user from a Next.js API Request.
 *
 * Priority order:
 *  1. Bearer JWT token in Authorization header (for scripts / Node.js clients)
 *  2. NextAuth JWT cookie (for browser sessions)
 *  3. NextAuth server session via getServerSession (fallback for edge cases)
 *
 * Returns a strongly-typed AuthUser or null if unauthenticated.
 */
export async function resolveUser(req: Request): Promise<AuthUser | null> {
    // ── LOAD TEST BYPASS ──────────────────────────────────────────────────
    // Only active when LOAD_TEST env var is explicitly "true".
    // Returns a synthetic admin user so k6 can hit APIs without auth cookies.
    if (process.env.LOAD_TEST === "true") {
        try {
            const url = new URL(req.url, "http://localhost");
            if (url.searchParams.get("test") === "true") {
                return {
                    id: "test-user",
                    email: "b@1.com",
                    role: "admin",
                    businessId: "BIZ001", // used by new logic
                    poolId: "BIZ001",     // 🔥 required for legacy dashboard APIs
                };
            }
        } catch {
            // ignore malformed URL — fall through to real auth
        }
    }

    // 1. Bearer token check
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
        try {
            const bearerToken = authHeader.split(" ")[1];
            const secret = new TextEncoder().encode(process.env.JWT_SECRET);
            const { payload } = await jwtVerify(bearerToken, secret);
            const user = normalizeRawPayload(payload as Record<string, unknown>);
            if (user) return user;
        } catch {
            // Invalid bearer token — fall through to NextAuth
        }
    }

    // 2. NextAuth JWT cookie
    const token = await getToken({ req: req as Parameters<typeof getToken>[0]["req"] });
    if (token) {
        const user = normalizeRawPayload(token as Record<string, unknown>);
        if (user) return user;
    }

    // 3. NextAuth Server Session (slower, for edge-case compatibility)
    const session = await getServerSession(authOptions);
    if (session?.user) {
        const user = normalizeRawPayload(session.user as Record<string, unknown>);
        if (user) return user;
    }

    return null;
}
