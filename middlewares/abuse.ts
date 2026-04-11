import { NextResponse } from "next/server";
import { applySecurityHeaders } from "./security";
import { redis } from "./rateLimit";

// Abuse Detection (edge-compatible)
const abuseMap = new Map<string, { count: number; windowStart: number; blockedUntil: number }>();
const ABUSE_WINDOW = 5 * 60_000;   // 5 minutes
const ABUSE_THRESHOLD = 2000;      // requests 
const ABUSE_BLOCK = 60_000;        // 1 minute

export async function detectAbuse(key: string): Promise<boolean> {
    const redisKey = `abuse:${key}`;
    const blockKey = `abuse:block:${key}`;
    const now = Date.now();

    if (redis) {
        try {
            // Check if actively blocked
            const isBlocked = await redis.get(blockKey);
            if (isBlocked) return true;

            const count = await redis.incr(redisKey);
            if (count === 1) {
                await redis.expire(redisKey, 300); // Wait next 5 min window
            }
            if (count > ABUSE_THRESHOLD) {
                // Warning: setex isn't native on all Upstash clients, set with ex
                await redis.set(blockKey, "1", { ex: 900 }); // Block for 15 min
                return true;
            }
            return false;
        } catch (e) {
            console.warn("[AbuseLimit] Redis failed, falling back to memory:", e);
        }
    }

    const record = abuseMap.get(key);

    if (record?.blockedUntil && now < record.blockedUntil) return true;
    if (record?.blockedUntil && now >= record.blockedUntil) {
        abuseMap.delete(key);
        return false;
    }

    if (!record || now > record.windowStart + ABUSE_WINDOW) {
        abuseMap.set(key, { count: 1, windowStart: now, blockedUntil: 0 });
        return false;
    }

    record.count++;
    if (record.count > ABUSE_THRESHOLD) {
        record.blockedUntil = now + ABUSE_BLOCK;
        return true;
    }
    return false;
}

export async function withAbuse(abuseKey: string, role?: string): Promise<NextResponse | undefined> {
    if (role !== "superadmin" && (await detectAbuse(abuseKey))) {
        const res = NextResponse.json(
            { error: "Suspicious activity detected. Temporarily blocked." },
            { status: 403 }
        );
        applySecurityHeaders(res);
        return res;
    }
    return undefined;
}
