import { redis } from "./redis";
import crypto from "crypto";

/**
 * JWT verification cache — avoids redundant crypto operations.
 * 
 * Jose JWT verification is CPU-intensive (~2-5ms per verify).
 * At 3000 concurrent users × multiple requests each, this adds up.
 * 
 * Strategy:
 *   1. Hash the token (SHA256, first 16 chars — collision safe enough)
 *   2. Check Redis for cached verification result
 *   3. On miss → full verify → cache result with TTL = remaining token life
 *   4. On Redis failure → fall through to full verify
 */

const JWT_CACHE_PREFIX = "jwt:v:";

export async function verifyJWTCached(
    token: string,
    verifyFn: (token: string) => Promise<any>,
    maxTTL: number = 300 // Max cache TTL in seconds (5 min)
): Promise<any> {
    // Hash token to avoid storing raw JWTs in Redis
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex").slice(0, 16);
    const cacheKey = `${JWT_CACHE_PREFIX}${tokenHash}`;

    // L1: Redis cache check
    if (redis) {
        try {
            const cached = await redis.get<string>(cacheKey);
            if (cached) {
                return typeof cached === "string" ? JSON.parse(cached) : cached;
            }
        } catch {
            // Redis down — fall through
        }
    }

    // L2: Full verification
    const result = await verifyFn(token);

    // Calculate remaining TTL from token expiry
    let ttl = maxTTL;
    if (result?.exp) {
        const remaining = Math.floor(result.exp - Date.now() / 1000);
        ttl = Math.min(remaining, maxTTL);
    }

    // Cache result (fire-and-forget)
    if (redis && ttl > 0) {
        try {
            await redis.set(cacheKey, JSON.stringify(result), { ex: ttl });
        } catch {
            // Non-critical
        }
    }

    return result;
}

/**
 * NextAuth session cache — avoids DB hit on every server component render.
 * 
 * getServerSession() hits the database on every call.
 * With 50+ admin sessions × 5 server components per page = 250+ DB hits/min.
 * 
 * Cache session in Redis with 60s TTL. Invalidated on logout.
 */

const SESSION_CACHE_PREFIX = "session:";

export async function getCachedSession(
    sessionToken: string | undefined,
    fetchSession: () => Promise<any>
): Promise<any> {
    if (!sessionToken) return fetchSession();

    const cacheKey = `${SESSION_CACHE_PREFIX}${sessionToken.slice(0, 16)}`;

    // L1: Redis check
    if (redis) {
        try {
            const cached = await redis.get<string>(cacheKey);
            if (cached) {
                return typeof cached === "string" ? JSON.parse(cached) : cached;
            }
        } catch {
            // Redis down — fall through
        }
    }

    // L2: Full session fetch
    const session = await fetchSession();

    // Cache for 60 seconds
    if (redis && session) {
        try {
            await redis.set(cacheKey, JSON.stringify(session), { ex: 60 });
        } catch {
            // Non-critical
        }
    }

    return session;
}

/**
 * Invalidate cached session on logout.
 */
export async function invalidateCachedSession(sessionToken: string) {
    if (!redis || !sessionToken) return;
    try {
        await redis.del(`${SESSION_CACHE_PREFIX}${sessionToken.slice(0, 16)}`);
    } catch {
        // Non-critical
    }
}
