import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { PoolSession } from "@/models/PoolSession";
import { Pool } from "@/models/Pool";
import { redis } from "@/lib/redis";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get("authorization");
    const querySecret = new URL(req.url).searchParams.get("secret");
    const providedSecret = authHeader?.startsWith("Bearer ")
        ? authHeader.slice(7)
        : querySecret;

    if (!cronSecret || providedSecret !== cronSecret) {
        return NextResponse.json({ error: "Unauthorized", code: "FORBIDDEN" }, { status: 401 });
    }

    try {
        await dbConnect();
        
        // Find all pools
        const pools = await Pool.find({}).select("poolId").lean();

        for (const pool of pools) {
            const poolId = pool.poolId;
            if (!poolId) continue;

            const result = await PoolSession.aggregate([
                { $match: { poolId, status: "active" } },
                { $group: { _id: null, count: { $sum: "$numPersons" } } }
            ]);

            const count = result.length > 0 ? result[0].count : 0;

            if (redis) {
                const key = `pool:${poolId}:count`;
                await redis.set(key, count);
            }
        }

        return NextResponse.json({ success: true, message: "Occupancy synced to Redis" });
    } catch (error) {
        logger.error("[Cron] Occupancy sync failed", { error: String(error) });
        return NextResponse.json({ error: "Server error during sync" }, { status: 500 });
    }
}
