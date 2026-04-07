import { redis } from "./redis";
import { dbConnect } from "./mongodb";
import { PoolSession } from "@/models/PoolSession";

/**
 * High-speed occupancy tracker utilizing Redis INCR/DECR atomic counters.
 * Crucial for preventing massive aggregate() DB locks at scale.
 */
export async function getOccupancy(poolId: string): Promise<number> {
    const key = `pool:${poolId}:count`;
    
    if (redis) {
        try {
            const count = await redis.get<number>(key);
            if (count !== null) {
                console.log("Redis occupancy used");
                return Number(count);
            }
        } catch (e) {
            console.warn("[Occupancy] Redis lookup failed:", e);
        }
    }

    console.log("Fallback to Mongo occupancy");
    // ── Safe Fallback: Calculate via DB directly ─────────────────────
    await dbConnect();
    const result = await PoolSession.aggregate([
        { $match: { poolId, status: "active" } },
        { $group: { _id: null, count: { $sum: "$numPersons" } } } 
    ]);
    
    // In AquaSync, normally PoolSession is per member. So $sum: 1
    const count = result.length > 0 ? result[0].count : 0;
    
    // Seed Redis to avoid future aggregate calls
    if (redis) {
        try {
            await redis.set(key, count);
        } catch (e) {}
    }
    
    return count;
}

export async function incrOccupancy(poolId: string, amount: number = 1) {
    const key = `pool:${poolId}:count`;
    if (redis) {
        try {
            await redis.incrby(key, amount);
        } catch (e) {
            console.warn("[Occupancy] Redis INCR failed:", e);
        }
    }
}

export async function decrOccupancy(poolId: string, amount: number = 1) {
    const key = `pool:${poolId}:count`;
    if (redis) {
        try {
            const newVal = await redis.decrby(key, amount);
            if (newVal < 0) {
                await redis.set(key, 0); // Correct desynchronizations
            }
        } catch (e) {
            console.warn("[Occupancy] Redis DECR failed:", e);
        }
    }
}
