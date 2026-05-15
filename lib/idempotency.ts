/**
 * lib/idempotency.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Lightweight in-memory idempotency guard for preventing duplicate
 * financial writes from double-clicks, browser retries, and refreshes.
 *
 * USAGE:
 *   import { isDuplicate } from "@/lib/idempotency";
 *   if (isDuplicate(`rent-cycle:${hostelId}`, 30_000)) {
 *       return NextResponse.json({ error: "Already processing" }, { status: 429 });
 *   }
 *
 * NOT a replacement for DB-level idempotency keys — this is a first line
 * of defense against rapid duplicates within a single serverless instance.
 * ─────────────────────────────────────────────────────────────────────────
 */

import { LRUCache } from "lru-cache";

const dedupeCache = new LRUCache<string, number>({
    max: 10_000,
    ttl: 120_000, // 2 minute max TTL
});

/**
 * Returns true if this operation key was seen within the given window.
 * Also marks the key as "in progress" so subsequent calls return true.
 *
 * @param key   Unique string for the operation (e.g. `payment:${hostelId}:${memberId}`)
 * @param windowMs  Deduplication window in milliseconds (default 10s)
 */
export function isDuplicate(key: string, windowMs: number = 10_000): boolean {
    const lastSeen = dedupeCache.get(key);
    const now = Date.now();

    if (lastSeen && now - lastSeen < windowMs) {
        return true;
    }

    dedupeCache.set(key, now, { ttl: windowMs });
    return false;
}

/**
 * Clear a dedup key (e.g., after a failed operation to allow retry).
 */
export function clearDedupe(key: string): void {
    dedupeCache.delete(key);
}
