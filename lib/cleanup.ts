import { PoolSession } from "@/models/PoolSession";
import { dbConnect } from "./mongodb";
import { decrOccupancy } from "./redisOccupancy";
import { redis } from "./redis";

// ── Concurrency guard: prevent parallel cleanup runs from stacking ──────
let _cleanupRunning = false;

export async function runOccupancyCleanupInBackground() {
    // Skip if another cleanup is already in progress (prevents N parallel scans
    // when N dashboard requests arrive simultaneously)
    if (_cleanupRunning) return;
    _cleanupRunning = true;

    try {
        await dbConnect();
        const now = new Date();
        const expiredSessions = await PoolSession.find({
            status: "active",
            expiryTime: { $lte: now }
        }).limit(500).lean();

        if (expiredSessions.length === 0) return;

        const sessionIds = expiredSessions.map(s => s._id);
        const decrPromises = expiredSessions.map(s => 
            s.poolId ? decrOccupancy(s.poolId, s.numPersons || 1) : Promise.resolve()
        );

        await Promise.all([
            PoolSession.updateMany({ _id: { $in: sessionIds } }, { $set: { status: "completed" } }),
            ...decrPromises
        ]);
    } catch (error) {
        console.error("Cleanup error in background:", error);
    } finally {
        _cleanupRunning = false;
    }
}

/**
 * ── Reconciliation Sync (Prompt 1.1) ──
 * Every 5 mins, this can be triggered to push Mongo state to Redis.
 * Prevents phantom-occupancy if Redis/Mongo drifts.
 */
export async function syncOccupancyToRedis(poolId: string) {
    if (!redis) return;
    try {
        const { getOccupancy } = await import("./redisOccupancy");
        const mongoCount = await getOccupancy(poolId); // Falling back triggers the aggregate
        await redis.set(`pool:${poolId}:count`, mongoCount, { ex: 300 }); // 5 min TTL
        console.log(`[Reconciliation] Synced Pool ${poolId}: ${mongoCount}`);
    } catch (e) {
        console.error(`[Reconciliation] Sync failed for ${poolId}:`, e);
    }
}
