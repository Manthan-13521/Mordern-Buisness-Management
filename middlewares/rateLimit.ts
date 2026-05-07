import { NextResponse } from "next/server";
import { applySecurityHeaders } from "./security";
import { Redis } from "@upstash/redis";
import type { NextRequestWithAuth } from "next-auth/middleware";
import { logger } from "@/lib/logger";

export const redis = (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

// ── In-memory fallback for when Redis is unavailable ──
const rateMap = new Map<string, { count: number; resetAt: number }>();

// ── Sliding Window Rate Limits ──────────────────────────────────────────
// Per-endpoint limits (req/minute). These are the base limits;
// burst allowance = 2× for 10 seconds, then throttle.
const ENDPOINT_LIMITS: Record<string, number> = {
    // Heavy endpoints (STRICTER)
    'GET:/api/members': 40,
    'GET:/api/dashboard': 50,
    'GET:/api/app-init': 30,
    // Light endpoints
    'GET:/api/payments': 80,
    // Write endpoints
    'POST:/api/member/login': 5,
    'POST:/api/members': 20,
    'POST:/api/entertainment-members': 20,
    'POST:/api/payments': 15,
    'POST:/api/razorpay/create-order': 10,
    'POST:/api/razorpay/verify': 10,
    'POST:/api/entry': 60,
    'POST:/api/pool/scan': 60,
    'GET:/api/metrics/health': 60,
    'POST:/api/settings/backup': 3,
    'GET:/api/settings/backup/excel': 3,
    'GET:/api/backups/list': 10,
    'GET:/api/backups/download': 5,
    'GET:/api/export/members': 5,
    'GET:/api/payments/export': 5,
    'POST:/api/plans': 10,
    'POST:/api/notifications': 10,
    'POST:/api/pool/register': 10,
    'POST:/api/pools/subscribe': 5,
    'GET:/api/cron/cleanup': 2,
    'POST:/api/jobs/generate-card': 10,
    'POST:/api/seed': 2,
    // Hostel
    'POST:/api/hostel/register': 10,
    'POST:/api/hostel/members': 20,
    'POST:/api/hostel/payments': 15,
    'POST:/api/hostel/plans': 10,
    'GET:/api/cron/hostel-expiry-alerts': 2,
    // Subscription
    'POST:/api/subscription/create-order': 10,
    'POST:/api/subscription/activate': 10,
    'POST:/api/subscription/webhook': 20,
    'GET:/api/subscription/status': 30,
    'GET:/api/cron/subscription-expiry': 2,
    'POST:/api/cron/subscription-expiry': 2,
    // Business module
    'GET:/api/business/analytics': 100,
    'GET:/api/business/customers': 100,
    'POST:/api/business/customers': 100,
    'GET:/api/business/labour': 100,
    'POST:/api/business/labour': 100,
    'POST:/api/business/attendance': 100,
};

// Global defaults
const DEFAULT_LIMIT_PER_USER = 60;   // 60 req/min per authenticated user
const DEFAULT_LIMIT_PER_IP = 120;    // 120 req/min per IP (unauthenticated)
const WINDOW_SECONDS = 60;           // 1 minute sliding window
const BURST_MULTIPLIER = 2;          // Allow 2× burst
const BURST_WINDOW_SECONDS = 10;     // Burst window duration

export function getIp(req: NextRequestWithAuth): string {
    return (
        req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
        req.headers.get("x-real-ip") ||
        req.headers.get("cf-connecting-ip") ||
        "unknown"
    );
}

/**
 * Sliding Window Rate Limiter with Burst Support.
 * 
 * Uses two Redis keys per identifier:
 *   - rate:{key}:main  → main window counter (60s TTL)
 *   - rate:{key}:burst → burst window counter (10s TTL)
 * 
 * Algorithm:
 *   1. Check burst window first — allow up to 2× limit in 10s
 *   2. Check main window — allow up to limit in 60s
 *   3. If either is exceeded → 429
 */
export async function checkRateLimit(
    ip: string,
    userId: string,
    method: string,
    path: string
): Promise<{ allowed: boolean; limit: number; remaining: number; retryAfter: number }> {
    const normalized = path.replace(/\/[a-f0-9]{24}/g, "").replace(/\/[^/]+\/admin/, "");
    const endpointKey = `${method}:${normalized}`;
    const limit = ENDPOINT_LIMITS[endpointKey] || (userId !== "guest" ? DEFAULT_LIMIT_PER_USER : DEFAULT_LIMIT_PER_IP);
    const burstLimit = Math.ceil(limit * BURST_MULTIPLIER / (WINDOW_SECONDS / BURST_WINDOW_SECONDS));

    // Prefer user ID for auth'd users, fall back to IP.
    // For tenant routes, include tenant scope to prevent cross-tenant quota exhaustion.
    let identifier = userId !== "guest" ? `user:${userId}` : `ip:${ip}`;

    // ── Tenant-aware key isolation ──────────────────────────────────────────
    // Extract tenant slug from path for business/pool/hostel routes.
    // This ensures one tenant's heavy usage doesn't starve another tenant's quota.
    const tenantMatch = path.match(/\/(business|pool|hostel)\/([^/]+)/);
    if (tenantMatch) {
        identifier = `${identifier}:t:${tenantMatch[2]}`;
    }

    const mainKey = `rate:${endpointKey}:${identifier}`;
    const burstKey = `rate:burst:${endpointKey}:${identifier}`;

    if (redis) {
        try {
            // Pipeline: increment both counters atomically
            const pipeline = redis.pipeline();
            pipeline.incr(mainKey);
            pipeline.incr(burstKey);
            const results = await pipeline.exec();

            const mainCount = (results[0] as number) || 0;
            const burstCount = (results[1] as number) || 0;

            // Set TTLs only on first increment (count === 1)
            const ttlOps: Promise<any>[] = [];
            if (mainCount === 1) {
                ttlOps.push(redis.expire(mainKey, WINDOW_SECONDS));
            }
            if (burstCount === 1) {
                ttlOps.push(redis.expire(burstKey, BURST_WINDOW_SECONDS));
            }
            if (ttlOps.length > 0) {
                await Promise.all(ttlOps);
            }

            // Check burst limit (short-term spike protection)
            if (burstCount > burstLimit) {
                return {
                    allowed: false,
                    limit,
                    remaining: 0,
                    retryAfter: BURST_WINDOW_SECONDS
                };
            }

            // Check main window limit
            if (mainCount > limit) {
                return {
                    allowed: false,
                    limit,
                    remaining: 0,
                    retryAfter: WINDOW_SECONDS
                };
            }

            return {
                allowed: true,
                limit,
                remaining: Math.max(0, limit - mainCount),
                retryAfter: 0
            };
        } catch (e) {
            logger.warn("[RateLimit] Redis failed, falling back to memory");
        }
    }

    // ── In-Memory Fallback (single-instance only) ──
    const now = Date.now();
    const cacheKey = `${endpointKey}:${identifier}`;
    const record = rateMap.get(cacheKey);

    if (record) {
        if (now > record.resetAt) {
            rateMap.set(cacheKey, { count: 1, resetAt: now + WINDOW_SECONDS * 1000 });
            return { allowed: true, limit, remaining: limit - 1, retryAfter: 0 };
        }
        if (record.count >= limit) {
            const retryAfter = Math.ceil((record.resetAt - now) / 1000);
            return { allowed: false, limit, remaining: 0, retryAfter };
        }
        record.count++;
        return { allowed: true, limit, remaining: limit - record.count, retryAfter: 0 };
    }

    rateMap.set(cacheKey, { count: 1, resetAt: now + WINDOW_SECONDS * 1000 });
    return { allowed: true, limit, remaining: limit - 1, retryAfter: 0 };
}

// NOTE: In Vercel serverless, each cold start gets a fresh V8 isolate.
// The in-memory rateMap is best-effort only — it does NOT persist across invocations.
// Redis (via UPSTASH_REDIS_REST_URL) is the primary rate limiter.
// No cleanup interval needed — the Map is garbage-collected with the isolate.

/**
 * Middleware wrapper — called from middleware.ts.
 * Skips rate limiting for superadmin and load test requests.
 */
export async function withRateLimit(
    req: NextRequestWithAuth,
    role?: string
): Promise<{ res?: NextResponse; rl?: { limit: number; remaining: number } }> {
    const path = req.nextUrl.pathname;
    const method = req.method;
    const ip = getIp(req);
    const userId = (req.nextauth?.token?.id as string) || (req.nextauth?.token?.email as string) || "guest";

    // Skip for superadmin (higher trust)
    if (role === "superadmin") {
        return { rl: { limit: 9999, remaining: 9999 } };
    }

    const rl = await checkRateLimit(ip, userId, method, path);

    if (!rl.allowed) {
        const res = NextResponse.json(
            {
                error: "Rate limit exceeded. Try again later.",
                retryAfterSeconds: rl.retryAfter,
            },
            { status: 429 }
        );
        res.headers.set("Retry-After", String(rl.retryAfter));
        res.headers.set("X-RateLimit-Limit", String(rl.limit));
        res.headers.set("X-RateLimit-Remaining", "0");
        applySecurityHeaders(res);
        return { res, rl: { limit: rl.limit, remaining: 0 } };
    }

    return { rl: { limit: rl.limit, remaining: rl.remaining } };
}
