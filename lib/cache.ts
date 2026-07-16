import { redis } from "./redis";

/**
 * 2-Layer Hybrid Cache: Memory L1 (short TTL) + Upstash Redis L2 (main)
 * Optimized for verifying member status and face embeddings
 * effectively operating across serverless instances.
 */
class FastCache {
    private cache: Map<string, { value: any; expiry: number }> = new Map();
    private readonly MAX_SIZE = 5000;

    async set(key: string, value: any, ttlSeconds: number = 300) {
        if (this.cache.size >= this.MAX_SIZE) {
            // Evict oldest 20% of entries to prevent memory leak
            const entriesToDelete = Math.ceil(this.MAX_SIZE * 0.2);
            let deleted = 0;
            for (const k of this.cache.keys()) {
                this.cache.delete(k);
                if (++deleted >= entriesToDelete) break;
            }
        }
        
        const l1Expiry = Date.now() + 5 * 1000; // L1: 5-second max locally
        this.cache.set(key, { value, expiry: l1Expiry });
        
        if (redis) {
            try {
                await redis.set(key, JSON.stringify(value), { ex: ttlSeconds });
            } catch (err) {}
        }
    }

    async get(key: string) {
        // L1 Check
        const item = this.cache.get(key);
        if (item && Date.now() <= item.expiry) {
            return item.value;
        }

        // L2 Check
        if (redis) {
            try {
                const redisValue = await redis.get(key);
                if (redisValue) {
                    // Populate L1 back
                    this.cache.set(key, { value: redisValue, expiry: Date.now() + 5000 });
                    return redisValue;
                }
            } catch (err) {}
        }

        return null;
    }

    async delete(key: string) {
        this.cache.delete(key);
        if (redis) {
            try { await redis.del(key); } catch (err) {}
        }
    }
    
    async clear() {
        this.cache.clear();
        // Redis flush logic is intensive; avoid exposing clear() natively 
        // to public if possible, but keep interface consistent.
    }
}

export const memberCache = new FastCache();

/**
 * Short-lived cache for user active-status lookups (Issue 4 — JWT Trust).
 * Caches { isActive, isDeleted, role } per userId for 5 minutes.
 * Invalidated immediately when a user is disabled, deleted, or role-changed.
 */
export const userStatusCache = new FastCache();
