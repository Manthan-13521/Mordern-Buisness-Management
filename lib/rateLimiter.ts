/**
 * lib/rateLimiter.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Lightweight in-memory rate limiter for Business SaaS API routes.
 * 
 * Uses a sliding window counter stored in a Map.
 * Safe for serverless (state resets on cold start — acceptable tradeoff).
 * For 1000+ users, upgrade to Redis-backed (e.g. @upstash/ratelimit).
 *
 * USAGE:
 *   import { rateLimit } from "@/lib/rateLimiter";
 *   
 *   const limiter = rateLimit({ windowMs: 60_000, max: 30 });
 *   
 *   export async function POST(req: Request) {
 *     const ip = req.headers.get("x-forwarded-for") || "unknown";
 *     const { allowed, remaining } = limiter.check(ip);
 *     if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
 *     ...
 *   }
 * ─────────────────────────────────────────────────────────────────────────
 */

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

interface RateLimitConfig {
    /** Window duration in ms (default 60s) */
    windowMs?: number;
    /** Max requests per window (default 30) */
    max?: number;
    /** Max entries before forced eviction (prevents memory leak) */
    maxEntries?: number;
}

interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetAt: number;
}

export function rateLimit(config: RateLimitConfig = {}) {
    const {
        windowMs = 60_000,
        max = 30,
        maxEntries = 5_000,
    } = config;

    const store = new Map<string, RateLimitEntry>();

    function evictExpired() {
        const now = Date.now();
        if (store.size > maxEntries) {
            for (const [key, entry] of store) {
                if (now > entry.resetAt) store.delete(key);
            }
        }
    }

    return {
        check(key: string): RateLimitResult {
            const now = Date.now();

            // Periodic eviction
            if (store.size > maxEntries * 0.8) evictExpired();

            const entry = store.get(key);

            if (!entry || now > entry.resetAt) {
                // New window
                store.set(key, { count: 1, resetAt: now + windowMs });
                return { allowed: true, remaining: max - 1, resetAt: now + windowMs };
            }

            entry.count++;

            if (entry.count > max) {
                return { allowed: false, remaining: 0, resetAt: entry.resetAt };
            }

            return { allowed: true, remaining: max - entry.count, resetAt: entry.resetAt };
        },

        /** For tenant-aware limiting: combines tenant + IP */
        checkTenant(tenantId: string, ip: string): RateLimitResult {
            return this.check(`${tenantId}:${ip}`);
        },
    };
}

// ── Pre-configured limiters for Business SaaS ──

/** Financial writes: 20 req/min per tenant+IP */
export const financialWriteLimiter = rateLimit({ windowMs: 60_000, max: 20 });

/** Upload: 10 req/min per tenant+IP */
export const uploadLimiter = rateLimit({ windowMs: 60_000, max: 10 });

/** Analytics reads: 30 req/min per tenant+IP */
export const analyticsLimiter = rateLimit({ windowMs: 60_000, max: 30 });

/** General API: 60 req/min per IP */
export const generalLimiter = rateLimit({ windowMs: 60_000, max: 60 });
