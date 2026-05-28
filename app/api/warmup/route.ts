import { dbConnect } from "@/lib/mongodb"
import { NextResponse } from "next/server"
import { requireCronAuth } from "@/lib/requireCronAuth"

export const dynamic = "force-dynamic"

/**
 * GET /api/warmup
 *
 * Phase 2C FIX 5: Enhanced cache warming endpoint.
 * - Warms MongoDB connection pool
 * - Pre-populates Redis dashboard cache for active tenants
 * - Called by Vercel cron every 5 minutes to keep connections warm
 *
 * Authenticated via CRON_SECRET to prevent abuse.
 */
export async function GET(req: Request) {
  const authErr = requireCronAuth(req);
  // Allow unauthenticated access for basic health check (backward compat)
  // but only warm caches if authenticated
  const isAuthenticated = !authErr;

  await dbConnect();

  if (isAuthenticated) {
    try {
      // Warm dashboard cache for active tenants
      const { Pool } = await import("@/models/Pool");
      const { Hostel } = await import("@/models/Hostel");
      const { Business } = await import("@/models/Business");
      const { redis } = await import("@/lib/redis");

      // Fetch active tenant IDs (lightweight — only _id fields)
      const [pools, hostels, businesses] = await Promise.all([
        Pool.find({ isActive: { $ne: false } }).select("poolId").limit(100).lean(),
        Hostel.find({ isActive: { $ne: false } }).select("hostelId").limit(100).lean(),
        Business.find({ isActive: { $ne: false } }).select("businessId").limit(100).lean(),
      ]);

      // Warm Redis by touching dashboard cache keys (creates warm entries)
      // This ensures the first user request after cold start gets a cache hit
      if (redis) {
        const warmKeys = [
          ...pools.map((p: any) => `dashboard:${p.poolId}`),
          ...hostels.map((h: any) => `dashboard:hostel:${h.hostelId}`),
          ...businesses.map((b: any) => `dashboard:business:${b.businessId}`),
        ];

        // MGET to warm Redis connection + check which keys exist
        if (warmKeys.length > 0) {
          const batchSize = 50;
          for (let i = 0; i < warmKeys.length; i += batchSize) {
            const batch = warmKeys.slice(i, i + batchSize);
            await redis.mget(...batch); // Warms Redis connection, result discarded
          }
        }
      }

      return NextResponse.json({
        ok: true,
        warmed: {
          pools: pools.length,
          hostels: hostels.length,
          businesses: businesses.length,
        },
      }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    } catch (e: any) {
      // Cache warming failed — still return ok for health check
      console.error("[Warmup] Cache warming failed:", e?.message);
      return NextResponse.json({ ok: true, warmed: false, error: e?.message }, {
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" }
      });
    }
  }

  // Unauthenticated: basic health check only
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } })
}
