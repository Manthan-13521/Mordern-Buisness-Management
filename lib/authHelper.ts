import { jwtVerify } from "jose";
import { getToken } from "next-auth/jwt";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { userStatusCache } from "@/lib/cache";

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

import { requestContext } from "@/lib/requestContext";

function enrichContext(user: AuthUser | null): AuthUser | null {
    if (user) {
        const store = requestContext.getStore();
        if (store) {
            store.userId = user.id;
            store.poolId = user.poolId;
            store.hostelId = user.hostelId;
            store.businessId = user.businessId;
        }
    }
    return user;
}

/**
 * DB status cache key for a given userId.
 */
function userStatusKey(userId: string) {
    return `user:status:${userId}`;
}

/**
 * Verifies the user is still active in the database.
 * Uses a 5-minute cache (Redis → in-memory fallback) to avoid a DB hit on every request.
 * Only queries DB on cache miss.
 *
 * Returns true if user is active and not deleted.
 * Returns false if user is disabled or deleted — caller should return 401.
 */
async function verifyUserActiveStatus(userId: string): Promise<boolean> {
    const cacheKey = userStatusKey(userId);

    // L1/L2 cache check
    const cached = await userStatusCache.get(cacheKey);
    if (cached !== null) {
        try {
            const parsed = typeof cached === "string" ? JSON.parse(cached) : cached;
            if (typeof parsed === "object" && "isActive" in parsed) {
                return parsed.isActive === true && parsed.isDeleted !== true;
            }
        } catch {
            // Cache entry malformed — fall through to DB
        }
    }

    // Cache miss — query DB (lightweight .select for minimal load)
    try {
        const { dbConnect } = await import("@/lib/mongodb");
        const { User } = await import("@/models/User");
        await dbConnect();

        const user = await User.findById(userId)
            .select("isActive isDeleted")
            .lean() as { isActive?: boolean; isDeleted?: boolean } | null;

        if (!user) {
            // User not found — could be a legacy member token (pool admin, etc.)
            // Cache as active to avoid breaking legacy flows
            await userStatusCache.set(cacheKey, JSON.stringify({ isActive: true, isDeleted: false }), 300);
            return true;
        }

        const status = {
            isActive: user.isActive !== false,  // undefined treated as active
            isDeleted: user.isDeleted === true,
        };

        // Cache for 5 minutes
        await userStatusCache.set(cacheKey, JSON.stringify(status), 300);

        return status.isActive && !status.isDeleted;
    } catch {
        // DB lookup failed — fail open to avoid cascading outages
        // Only applies if the cache is completely cold and DB is unreachable
        return true;
    }
}

/**
 * Invalidates the user status cache for a given userId.
 * Call this whenever a user is disabled, deleted, or their role changes.
 */
export async function invalidateUserStatusCache(userId: string): Promise<void> {
    await userStatusCache.delete(userStatusKey(userId));
}

/**
 * Resolves the authenticated user from a Next.js API Request.
 *
 * Priority order:
 *  1. Bearer JWT token in Authorization header (for scripts / Node.js clients)
 *  2. NextAuth JWT cookie (for browser sessions)
 *  3. NextAuth server session via getServerSession (fallback for edge cases)
 *
 * All resolved users are verified against the DB (via cache) to ensure
 * disabled or deleted accounts lose access immediately.
 *
 * Returns a strongly-typed AuthUser or null if unauthenticated.
 */
export async function resolveUser(req: Request): Promise<AuthUser | null> {
    // ── LOAD TEST BYPASS ──────────────────────────────────────────────────
    // Only active when LOAD_TEST env var is explicitly "true".
    // Returns a synthetic admin user so k6 can hit APIs without auth cookies.
    if (process.env.LOAD_TEST === "true") {
        const loadTestSecret = (req.headers instanceof Headers)
            ? req.headers.get("x-load-test-secret")
            : (req as any).headers?.["x-load-test-secret"];
        if (loadTestSecret && loadTestSecret === process.env.LOAD_TEST_SECRET) {
            return enrichContext({
                id: "test-user",
                email: "b@1.com",
                role: "admin",
                businessId: "BIZ001", // used by new logic
                poolId: "BIZ001",     // required for legacy dashboard APIs
            });
        }
    }

    let user: AuthUser | null = null;

    // 1. Bearer token check
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
        try {
            const bearerToken = authHeader.split(" ")[1];
            const secret = new TextEncoder().encode(process.env.JWT_SECRET);
            const { payload } = await jwtVerify(bearerToken, secret);
            user = normalizeRawPayload(payload as Record<string, unknown>);
        } catch {
            // Invalid bearer token — fall through to NextAuth
        }
    }

    // 2. NextAuth JWT cookie
    if (!user) {
        const token = await getToken({ req: req as Parameters<typeof getToken>[0]["req"] });
        if (token) {
            user = normalizeRawPayload(token as Record<string, unknown>);
        }
    }

    // 3. NextAuth Server Session (slower, for edge-case compatibility)
    if (!user) {
        const session = await getServerSession(authOptions);
        if (session?.user) {
            user = normalizeRawPayload(session.user as Record<string, unknown>);
        }
    }

    if (!user) return null;

    // 4. Verify user is still active in DB (cached 5min to avoid per-request DB hits)
    const isActive = await verifyUserActiveStatus(user.id);
    if (!isActive) {
        // User has been disabled or deleted — deny access immediately
        return null;
    }

    return enrichContext(user);
}

