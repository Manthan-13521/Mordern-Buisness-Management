import { redis } from "./redis";

/**
 * Redis-backed dashboard cache with configurable TTL.
 * Falls back to direct computation if Redis is unavailable.
 * 
 * Architecture:
 *   1. Check Redis for cached result
 *   2. On miss → run fetcher → store in Redis
 *   3. On Redis failure → run fetcher directly (graceful degradation)
 */

const DEFAULT_TTL = 15; // seconds

export async function getCachedDashboard<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = DEFAULT_TTL
): Promise<T> {
  // L1: Redis check
  if (redis) {
    try {
      const cached = await redis.get<string>(key);
      if (cached !== null && cached !== undefined) {
        return typeof cached === "string" ? JSON.parse(cached) : cached as T;
      }
    } catch {
      // Redis down — fall through to fetcher
    }
  }

  // L2: Compute fresh
  const data = await fetcher();

  // Populate cache (fire-and-forget)
  if (redis) {
    try {
      await redis.set(key, JSON.stringify(data), { ex: ttlSeconds });
    } catch {
      // Non-critical — next request will retry
    }
  }

  return data;
}

/**
 * Invalidate dashboard cache for a specific pool.
 * Called after mutations (payment, member creation, etc.)
 */
export async function invalidateDashboard(poolId: string) {
  if (!redis) return;
  try {
    await Promise.all([
      redis.del(`dashboard:${poolId}:stats`),
      redis.del(`dashboard:${poolId}:kpis`),
      redis.del(`dashboard:${poolId}:counts`),
    ]);
  } catch {
    // Non-critical
  }
}
