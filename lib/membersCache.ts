import { redis, withTimeout } from "./redis";

/**
 * Hybrid cache: Upstash Redis (production) with in-memory fallback (dev).
 * TTL: 10 seconds for member list responses.
 */

const CACHE_TTL = 10; // seconds
const CACHE_PREFIX = "members:";

// ── In-memory fallback (for dev without Redis) ───────────────────────
interface MemCacheEntry { data: unknown; expiry: number }
const memCache = new Map<string, MemCacheEntry>();

// ── GET ──────────────────────────────────────────────────────────────
export async function getCache(key: string): Promise<unknown | null> {
    const fullKey = CACHE_PREFIX + key;

    // Try Redis first
    if (redis) {
        try {
            const cached = await withTimeout(redis.get(fullKey), 200);
            if (cached) return cached;
        } catch (err) {
            console.warn("[Cache] Redis GET failed, falling back to memory:", err);
        }
    }

    // In-memory fallback
    const entry = memCache.get(fullKey);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
        memCache.delete(fullKey);
        return null;
    }
    return entry.data;
}

// ── SET ──────────────────────────────────────────────────────────────
export async function setCache(key: string, data: unknown): Promise<void> {
    const fullKey = CACHE_PREFIX + key;

    // Try Redis
    if (redis) {
        try {
            const jitter = Math.floor(Math.random() * 3); // 0-2s jitter
            await redis.set(fullKey, JSON.stringify(data), { ex: CACHE_TTL + jitter });
            return;
        } catch (err) {
            console.warn("[Cache] Redis SET failed, falling back to memory:", err);
        }
    }

    // In-memory fallback
    memCache.set(fullKey, { data, expiry: Date.now() + CACHE_TTL * 1000 });
    // Evict oldest if too many entries
    if (memCache.size > 200) {
        const firstKey = memCache.keys().next().value;
        if (firstKey) memCache.delete(firstKey);
    }
}

// ── INVALIDATE ──────────────────────────────────────────────────────
export async function invalidateCache(poolId?: string): Promise<void> {
    // Clear in-memory
    if (!poolId) {
        memCache.clear();
    } else {
        const prefix = CACHE_PREFIX + `members-${poolId}`;
        for (const k of memCache.keys()) {
            if (k.startsWith(prefix)) memCache.delete(k);
        }
    }

    // Clear Redis — delete known keys directly (no SCAN)
    if (redis && poolId) {
        try {
            // Delete commonly-accessed page keys (pages 1-10 cover 99% of usage)
            const keysToDelete = [];
            for (let page = 1; page <= 10; page++) {
                for (const limit of [12, 20, 50]) {
                    keysToDelete.push(`${CACHE_PREFIX}members-${poolId}-p${page}-l${limit}`);
                }
            }
            if (keysToDelete.length > 0) {
                await redis.del(...keysToDelete);
            }
        } catch (err) {
            console.warn("[Cache] Redis invalidation failed:", err);
        }
    } else if (redis && !poolId) {
        // Global invalidation — only done on deploy/reset, acceptable to SCAN here
        try {
            let cursor = 0;
            do {
                const [nextCursor, keys] = await redis.scan(cursor, { match: `${CACHE_PREFIX}*`, count: 100 });
                cursor = Number(nextCursor);
                if (keys.length > 0) {
                    await redis.del(...keys);
                }
            } while (cursor !== 0);
        } catch (err) {
            console.warn("[Cache] Redis global invalidation failed:", err);
        }
    }
}
