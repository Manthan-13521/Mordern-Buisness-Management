/**
 * Abuse Detection System
 *
 * Tracks request patterns per user+IP key.
 * If a key exceeds a threshold within a time window, it's flagged as abusive.
 *
 * Uses in-memory Map with automatic cleanup for edge/serverless compatibility.
 * When Upstash Redis is configured, can be swapped to Redis-backed counters
 * for multi-instance support.
 */

import { redis } from "@/lib/redis";
import { logger } from "@/lib/logger";

interface AbuseRecord {
    count: number;
    windowStart: number;
    blocked: boolean;
    blockedUntil: number;
}

const abuseMap = new Map<string, AbuseRecord>();

const ABUSE_WINDOW_MS = 5 * 60 * 1000;     // 5-minute detection window
const ABUSE_THRESHOLD = 200;                 // Max requests per window
const BLOCK_DURATION_MS = 15 * 60 * 1000;   // 15-minute block

// Cleanup stale entries every 10 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, record] of abuseMap.entries()) {
        if (now > record.windowStart + ABUSE_WINDOW_MS && !record.blocked) {
            abuseMap.delete(key);
        }
        if (record.blocked && now > record.blockedUntil) {
            abuseMap.delete(key);
        }
    }
}, 10 * 60 * 1000);

/**
 * Detect abusive request patterns.
 * Uses Redis if available, falls back to in-memory map.
 * @returns true if the key is exhibiting abuse (should be blocked)
 */
export async function detectAbuse(key: string): Promise<boolean> {
    const now = Date.now();
    
    if (redis) {
        try {
            const blockKey = `abuse:blocked:${key}`;
            const countKey = `abuse:count:${key}`;
            
            // Check if blocked
            const isBlocked = await redis.get(blockKey);
            if (isBlocked) return true;
            
            // Increment count
            const count = await redis.incr(countKey);
            if (count === 1) {
                await redis.expire(countKey, Math.floor(ABUSE_WINDOW_MS / 1000));
            }
            
            if (count > ABUSE_THRESHOLD) {
                await redis.set(blockKey, "true", { ex: Math.floor(BLOCK_DURATION_MS / 1000) });
                return true;
            }
            return false;
        } catch (e) {
            logger.warn("[Abuse] Redis failed, falling back to memory", { error: String(e) });
        }
    }

    // -- In-Memory Fallback --
    const record = abuseMap.get(key);

    // If currently blocked, check if block has expired
    if (record?.blocked) {
        if (now > record.blockedUntil) {
            abuseMap.delete(key);
            return false;
        }
        return true; // Still blocked
    }

    if (!record || now > record.windowStart + ABUSE_WINDOW_MS) {
        // Enforce maximum size before adding new entries
        if (abuseMap.size >= 10000) {
            let deleted = 0;
            const toDelete = 2000;
            for (const k of abuseMap.keys()) {
                abuseMap.delete(k);
                if (++deleted >= toDelete) break;
            }
        }
        
        // New window
        abuseMap.set(key, { count: 1, windowStart: now, blocked: false, blockedUntil: 0 });
        return false;
    }

    record.count++;

    if (record.count > ABUSE_THRESHOLD) {
        record.blocked = true;
        record.blockedUntil = now + BLOCK_DURATION_MS;
        return true;
    }

    return false;
}

/**
 * Get abuse statistics for monitoring.
 * (Local stats only, Redis stats would require SCAN)
 */
export function getAbuseStats(): { activeKeys: number; blockedKeys: number } {
    let blockedKeys = 0;
    for (const record of abuseMap.values()) {
        if (record.blocked) blockedKeys++;
    }
    return { activeKeys: abuseMap.size, blockedKeys };
}
