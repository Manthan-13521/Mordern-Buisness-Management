/**
 * lib/idempotency.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Serverless-safe idempotency guard for preventing duplicate financial
 * writes from double-clicks, browser retries, and refreshes.
 *
 * USAGE:
 *   import { isDuplicate } from "@/lib/idempotency";
 *   if (await isDuplicate(`rent-cycle:${hostelId}`, 30_000)) {
 *       return NextResponse.json({ error: "Already processing" }, { status: 429 });
 *   }
 *
 * PRIMARY: Uses Redis `setnx` so dedup works across all serverless instances.
 * FALLBACK: Uses in-memory LRUCache if Redis is unavailable (local dev).
 *
 * NOT a replacement for DB-level idempotency keys — this is a first line
 * of defense against rapid duplicates across serverless instances.
 * ─────────────────────────────────────────────────────────────────────────
 */

import { LRUCache } from "lru-cache";

// ── In-memory fallback (used when Redis is unavailable) ─────────────────
const dedupeCache = new LRUCache<string, number>({
    max: 10_000,
    ttl: 120_000, // 2 minute max TTL
});

/**
 * Returns true if this operation key was seen within the given window.
 * Also marks the key as "in progress" so subsequent calls return true.
 *
 * Uses Redis setnx for cross-instance dedup in serverless.
 * Falls back to in-memory LRUCache if Redis is unavailable.
 *
 * @param key   Unique string for the operation (e.g. `payment:${hostelId}:${memberId}`)
 * @param windowMs  Deduplication window in milliseconds (default 10s)
 */
export async function isDuplicate(key: string, windowMs: number = 10_000): Promise<boolean> {
    // ── Primary: Redis-backed cross-instance dedup ──────────────────────
    try {
        const { redis } = await import("@/lib/redis");
        if (redis) {
            const redisKey = `idemp:${key}`;
            const ttlSeconds = Math.max(1, Math.ceil(windowMs / 1000));
            // setnx returns 1 if key was set (new), 0 if it already existed (duplicate)
            const wasSet = await redis.setnx(redisKey, "1");
            if (wasSet === 1) {
                // Key was new — set expiry and allow the operation
                await redis.expire(redisKey, ttlSeconds);
                return false;
            }
            // Key already existed — this is a duplicate
            return true;
        }
    } catch {
        // Redis unavailable — fall through to in-memory fallback
    }

    // ── Fallback: In-memory LRUCache (single-instance only) ────────────
    const lastSeen = dedupeCache.get(key);
    const now = Date.now();

    if (lastSeen && now - lastSeen < windowMs) {
        return true;
    }

    dedupeCache.set(key, now, { ttl: windowMs });
    return false;
}

/**
 * Clear a dedup key (e.g., after a failed operation to allow retry).
 */
export async function clearDedupe(key: string): Promise<void> {
    // Clear from Redis
    try {
        const { redis } = await import("@/lib/redis");
        if (redis) {
            await redis.del(`idemp:${key}`);
        }
    } catch {
        // Non-critical
    }
    // Also clear from in-memory fallback
    dedupeCache.delete(key);
}
