import { NextResponse } from "next/server";
import { applySecurityHeaders } from "./security";
import { Redis } from "@upstash/redis";
import type { NextRequestWithAuth } from "next-auth/middleware";

export const redis = (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

const rateMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMITS: Record<string, number> = {
    'POST:/api/member/login': 5,
    'POST:/api/members': 20,
    'POST:/api/entertainment-members': 20,
    'POST:/api/payments': 15,
    'POST:/api/razorpay/create-order': 10,
    'POST:/api/razorpay/verify': 10,
    'POST:/api/entry': 60,
    'POST:/api/pool/scan': 60,
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
    // Hostel rate limits
    'POST:/api/hostel/register': 10,
    'POST:/api/hostel/members': 20,
    'POST:/api/hostel/payments': 15,
    'POST:/api/hostel/plans': 10,
    'GET:/api/cron/hostel-expiry-alerts': 2,
    // Subscription rate limits
    'POST:/api/subscription/create-order': 10,
    'POST:/api/subscription/activate':     10,
    'POST:/api/subscription/webhook':       20,
    'GET:/api/subscription/status':         30,
    'GET:/api/cron/subscription-expiry':     2,
    'POST:/api/cron/subscription-expiry':    2,
};
const DEFAULT_LIMIT = 50;
const WINDOW_MS = 60_000;

export function getIp(req: NextRequestWithAuth): string {
    return (
        req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
        req.headers.get("x-real-ip") ||
        req.headers.get("cf-connecting-ip") ||
        "unknown"
    );
}

export async function checkRateLimit(ip: string, userId: string, method: string, path: string) {
    const normalized = path.replace(/\/[a-f0-9]{24}/g, "").replace(/\/[^/]+\/admin/, "");
    const endpointKey = `${method}:${normalized}`;
    const limit = RATE_LIMITS[endpointKey] || DEFAULT_LIMIT;
    const cacheKey = `rl:${endpointKey}:${userId}:${ip}`;
    
    if (redis) {
        try {
            const current = await redis.incr(cacheKey);
            if (current === 1) {
                await redis.expire(cacheKey, 60);
            }
            if (current > limit) {
                return { allowed: false, limit, remaining: 0 };
            }
            return { allowed: true, limit, remaining: limit - current };
        } catch (e) {
            console.warn("[RateLimit] Redis failed, falling back to memory:", e);
        }
    }

    const now = Date.now();
    const record = rateMap.get(cacheKey);
    if (record) {
        if (now > record.resetAt) {
            rateMap.set(cacheKey, { count: 1, resetAt: now + WINDOW_MS });
            return { allowed: true, limit, remaining: limit - 1 };
        }
        if (record.count >= limit) {
            return { allowed: false, limit, remaining: 0 };
        }
        record.count++;
        return { allowed: true, limit, remaining: limit - record.count };
    }

    rateMap.set(cacheKey, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, limit, remaining: limit - 1 };
}

// Cleanup stale rate limit entries
setInterval(() => {
    const now = Date.now();
    for (const [key, val] of rateMap.entries()) {
        if (now > val.resetAt) rateMap.delete(key);
    }
}, 5 * 60_000);

// Middleware Execution Wrapper
export async function withRateLimit(req: NextRequestWithAuth, role?: string): Promise<{ res?: NextResponse, rl?: any }> {
    const path = req.nextUrl.pathname;
    const method = req.method;
    const ip = getIp(req);
    const userId = (req.nextauth?.token?.id as string) || (req.nextauth?.token?.email as string) || "guest";

    let rl = { allowed: true, limit: DEFAULT_LIMIT, remaining: DEFAULT_LIMIT };
    if (role !== "superadmin") {
        rl = await checkRateLimit(ip, userId, method, path);
        if (!rl.allowed) {
            const res = NextResponse.json(
                { error: "Too many requests. Please slow down.", retryAfterSeconds: 60 },
                { status: 429 }
            );
            res.headers.set("Retry-After", "60");
            res.headers.set("X-RateLimit-Limit", String(rl.limit));
            res.headers.set("X-RateLimit-Remaining", "0");
            applySecurityHeaders(res);
            return { res, rl };
        }
    }
    return { rl };
}
