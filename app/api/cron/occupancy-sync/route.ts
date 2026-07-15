import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { PoolSession } from "@/models/PoolSession";
import { Pool } from "@/models/Pool";
import { redis } from "@/lib/redis";
import { logger } from "@/lib/logger";
import { checkTenantMutability } from "@/lib/subscriptionGuard";
import { withHealthcheck } from "@/lib/healthchecks";
import { requestContext } from "@/lib/requestContext";

export async function GET(req: Request) {

        const requestId = req ? (req.headers.get("x-request-id") || crypto.randomUUID()) : crypto.randomUUID();
        const clientIp = req ? (req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown") : "unknown";
        const routePath = req ? new URL(req.url).pathname : "unknown";
        const requestMethod = "GET";

        return requestContext.run({
            requestId,
            ip: clientIp,
            route: routePath,
            method: requestMethod,
            startTime: Date.now()
        }, async () => {
            const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get("authorization");
    const querySecret = new URL(req.url).searchParams.get("secret");
    const providedSecret = authHeader?.startsWith("Bearer ")
            ? authHeader.slice(7)
            : querySecret;
    if (!cronSecret || providedSecret !== cronSecret) {
            return NextResponse.json({ error: "Unauthorized", code: "FORBIDDEN" }, { status: 401 });
        }
    return withHealthcheck({ checkName: "occupancy-sync", timeoutMs: 25000 }, async () => {
            try {
                await dbConnect();
                
                // Find all pools
                // Fetch only the poolId field — we need nothing else from Pool documents
                const pools = await Pool.find({}).select("poolId").lean();

                const BATCH_SIZE = 5;
                for (let i = 0; i < pools.length; i += BATCH_SIZE) {
                    const batch = pools.slice(i, i + BATCH_SIZE);
                    await Promise.all(batch.map(async (pool) => {
                        const poolId = pool.poolId;
                        if (!poolId) return;

                        // ── SUBSCRIPTION LOCKDOWN CHECK ──
                        const canMutate = await checkTenantMutability(poolId, "pool");
                        if (!canMutate) return;

                        const result = await PoolSession.aggregate([
                            { $match: { poolId, status: "active" } },
                            { $group: { _id: null, count: { $sum: "$numPersons" } } }
                        ]).option({ maxTimeMS: 10000 });

                        const count = result.length > 0 ? result[0].count : 0;

                        if (redis) {
                            const key = `pool:${poolId}:count`;
                            await redis.set(key, count, { ex: 300 }); // 5 min TTL
                        }
                    }));
                }

                return NextResponse.json({ success: true, message: "Occupancy synced to Redis" });
            } catch (error) {
                logger.error("[Cron] Occupancy sync failed", { error: String(error) });
                return NextResponse.json({ error: "Server error during sync" }, { status: 500 });
            }
        });
        });
            
}
