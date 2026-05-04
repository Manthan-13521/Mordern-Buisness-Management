import { redis, withTimeout } from "./redis";
import { cacheHitCounter } from "./metrics";

/**
 * Redis-backed dashboard cache with TTL jitter to prevent stampede.
 * Falls back to direct computation if Redis is unavailable.
 * 
 * Architecture:
 *   1. Check Redis for cached result (serve stale if available)
 *   2. On miss → run fetcher → store with jittered TTL
 *   3. On Redis failure → run fetcher directly (graceful degradation)
 *   4. Stale-while-revalidate: serve stale, refresh in background if age > 12s
 */

const DEFAULT_TTL = 15; // seconds base
const STALE_THRESHOLD = 12; // serve stale but trigger refresh after this many seconds

/** Add jitter to prevent cache stampede: TTL + random(0, jitterMax) */
function jitteredTTL(baseTTL: number, jitterMax: number = 5): number {
    return baseTTL + Math.floor(Math.random() * jitterMax);
}

/** Generic cache-with-jitter helper usable by any cache layer */
export function getJitteredTTL(baseTTL: number, jitterMax: number = 5): number {
    return jitteredTTL(baseTTL, jitterMax);
}

export async function getCachedDashboard<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = DEFAULT_TTL
): Promise<T> {
  // L1: Redis check
  if (redis) {
    try {
      // Check for cached data + its age (stored as metadata)
      const [cached, ageStr] = await withTimeout(Promise.all([
        redis.get<string>(key),
        redis.get<string>(`${key}:ts`),
      ]), 300);
      
      if (cached !== null && cached !== undefined) {
        cacheHitCounter.inc({ layer: "redis", result: "hit" });
        const parsed = typeof cached === "string" ? JSON.parse(cached) : cached as T;
        
        // Stale-while-revalidate: if data is old, trigger background refresh
        const age = ageStr ? (Date.now() - Number(ageStr)) / 1000 : 0;
        if (age > STALE_THRESHOLD) {
          // Return stale data immediately, refresh in background
          refreshInBackground(key, fetcher, ttlSeconds);
        }
        
        return parsed;
      } else {
        cacheHitCounter.inc({ layer: "redis", result: "miss" });
      }
    } catch {
      // Redis down — fall through to fetcher
    }
  }

  // L2: Compute fresh
  const data = await fetcher();

  // Populate cache with jittered TTL (prevents stampede)
  if (redis) {
    try {
      const ttl = jitteredTTL(ttlSeconds);
      await Promise.all([
        redis.set(key, JSON.stringify(data), { ex: ttl }),
        redis.set(`${key}:ts`, String(Date.now()), { ex: ttl + 5 }),
      ]);
    } catch {
      // Non-critical — next request will retry
    }
  }

  return data;
}

/** Background refresh — non-blocking, doesn't affect response time */
const refreshLocks = new Set<string>();

function refreshInBackground<T>(key: string, fetcher: () => Promise<T>, ttlSeconds: number) {
  // Prevent concurrent refreshes for the same key
  if (refreshLocks.has(key)) return;
  refreshLocks.add(key);

  fetcher()
    .then(async (data) => {
      if (redis) {
        const ttl = jitteredTTL(ttlSeconds);
        await Promise.all([
          redis.set(key, JSON.stringify(data), { ex: ttl }),
          redis.set(`${key}:ts`, String(Date.now()), { ex: ttl + 5 }),
        ]);
      }
    })
    .catch(() => {})
    .finally(() => refreshLocks.delete(key));
}

/**
 * Invalidate dashboard cache for a specific pool.
 * Called after mutations (payment, member creation, etc.)
 * Also invalidates app-init consolidated cache.
 */
export async function invalidateDashboard(poolId: string) {
  if (!redis) return;
  try {
    await Promise.all([
      redis.del(`dashboard:${poolId}:stats`),
      redis.del(`dashboard:${poolId}:stats:ts`),
      redis.del(`dashboard:${poolId}:kpis`),
      redis.del(`dashboard:${poolId}:kpis:ts`),
      redis.del(`dashboard:${poolId}:counts`),
      redis.del(`dashboard:${poolId}:counts:ts`),
      // Invalidate app-init consolidated caches (wildcard not available, use known pattern)
      redis.del(`app-init:${poolId}`),
    ]);
  } catch {
    // Non-critical
  }
}
