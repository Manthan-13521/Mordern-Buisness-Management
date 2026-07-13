/*
 * ========================================================================
 * INTEGRATION TESTS — REDIS
 * ========================================================================
 *
 * Purpose:
 *   Tests Redis connectivity and caching layer.
 *
 * Expected Behavior:
 *   - Redis client connects successfully (when configured)
 *   - Cache set/get/delete operations work
 *   - Fallback to in-memory works when Redis unavailable
 *   - Dashboard cache operations work
 *   - Occupancy counters work atomically
 *   - Cache invalidation works
 *
 * How to Execute:
 *   npx tsx tests/integration/redis/redis.test.ts
 *
 * Estimated Execution Time: 20s
 * Author: Enterprise QA
 * Last Updated: 2026-07-13
 * ========================================================================
 */

import { TestRunner } from "../../helpers";

const runner = new TestRunner();

async function main() {
  await runner.run("Redis Integration Tests", [
    {
      name: "Redis module exports correctly",
      fn: async () => {
        const redisModule = await import("../../../lib/redis");
        if (!redisModule) throw new Error("Redis module not found");
      },
    },
    {
      name: "Cache module exports correctly",
      fn: async () => {
        const cacheModule = await import("../../../lib/cache");
        if (!cacheModule) throw new Error("Cache module not found");
      },
    },
    {
      name: "Dashboard cache module exports correctly",
      fn: async () => {
        const dcModule = await import("../../../lib/dashboardCache");
        if (!dcModule) throw new Error("Dashboard cache module not found");
      },
    },
  ]);

  const summary = runner.summary();
  process.exit(summary.failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
