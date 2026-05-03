import { db } from "./db";

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  Offline Sync Queue — Dexie.js
 *  Queues operations when offline, flushes on reconnect with dedup
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * Architecture:
 *   1. When offline → enqueue(operation) stores in IndexedDB
 *   2. On reconnect → flush() processes queue in order
 *   3. Deduplication by entityId (only latest operation per entity)
 *   4. Exponential backoff on failures (2^n seconds, max 60s)
 *   5. Max 5 retries per operation before marking as failed
 */

export type SyncOperation = {
    id?: string;
    entityType: "member" | "payment" | "entry";
    entityId: string;
    operation: "create" | "update" | "delete";
    payload: any;
    createdAt: number;
    retryCount: number;
    lastTriedAt?: number;
    status: "pending" | "processing" | "failed_permanent";
};

const MAX_RETRIES = 5;

/**
 * Add operation to sync queue. Deduplicates by entityId — 
 * if an operation for the same entity is already queued, replace it.
 */
export async function enqueueSync(op: Omit<SyncOperation, "id" | "createdAt" | "retryCount" | "status">) {
    const existing = await db.syncQueue
        .where("entityId")
        .equals(op.entityId)
        .and(item => item.status === "pending")
        .first();

    if (existing) {
        // Replace with latest operation (last-write-wins at queue level)
        await db.syncQueue.update(existing.id!, {
            ...op,
            createdAt: Date.now(),
            retryCount: 0,
            status: "pending" as const,
        });
    } else {
        await db.syncQueue.add({
            ...op,
            createdAt: Date.now(),
            retryCount: 0,
            status: "pending" as const,
        });
    }
}

/**
 * Flush all pending operations to the server.
 * Called on reconnect or periodically.
 */
let isFlushing = false;

export async function flushSyncQueue(): Promise<{ processed: number; failed: number }> {
    if (isFlushing) return { processed: 0, failed: 0 };
    isFlushing = true;

    let processed = 0;
    let failed = 0;

    try {
        const pending = await db.syncQueue
            .where("status")
            .equals("pending")
            .sortBy("createdAt");

        for (const op of pending) {
            // Exponential backoff: skip if retried too recently
            const backoff = Math.min(1000 * Math.pow(2, op.retryCount), 60000);
            if (op.lastTriedAt && (Date.now() - op.lastTriedAt) < backoff) continue;

            // Max retries exceeded
            if (op.retryCount >= MAX_RETRIES) {
                await db.syncQueue.update(op.id!, { status: "failed_permanent" as const });
                failed++;
                continue;
            }

            try {
                await db.syncQueue.update(op.id!, {
                    status: "processing" as const,
                    lastTriedAt: Date.now(),
                });

                const endpoint = getEndpoint(op.entityType, op.operation);
                const method = getMethod(op.operation);

                const res = await fetch(endpoint, {
                    method,
                    headers: { "Content-Type": "application/json" },
                    body: method !== "DELETE" ? JSON.stringify(op.payload) : undefined,
                });

                if (res.ok) {
                    await db.syncQueue.delete(op.id!);
                    processed++;
                } else if (res.status >= 400 && res.status < 500) {
                    // Client error — don't retry
                    await db.syncQueue.update(op.id!, {
                        status: "failed_permanent" as const,
                        retryCount: op.retryCount + 1,
                    });
                    failed++;
                } else {
                    // Server error — retry
                    await db.syncQueue.update(op.id!, {
                        status: "pending" as const,
                        retryCount: op.retryCount + 1,
                    });
                }
            } catch {
                // Network error — retry
                await db.syncQueue.update(op.id!, {
                    status: "pending" as const,
                    retryCount: op.retryCount + 1,
                    lastTriedAt: Date.now(),
                });
            }
        }
    } finally {
        isFlushing = false;
    }

    return { processed, failed };
}

/**
 * Get queue status for sync indicator UI.
 */
export async function getSyncQueueStatus(): Promise<{
    pending: number;
    failed: number;
    total: number;
}> {
    const all = await db.syncQueue.toArray();
    return {
        pending: all.filter(o => o.status === "pending" || o.status === "processing").length,
        failed: all.filter(o => o.status === "failed_permanent").length,
        total: all.length,
    };
}

/**
 * Clear permanently failed operations (admin action).
 */
export async function clearFailedOperations(): Promise<number> {
    const failed = await db.syncQueue
        .where("status")
        .equals("failed_permanent")
        .toArray();
    
    for (const op of failed) {
        await db.syncQueue.delete(op.id!);
    }
    
    return failed.length;
}

// ── Helpers ──────────────────────────────────────────────────────

function getEndpoint(entityType: string, _operation: string): string {
    const map: Record<string, string> = {
        member: "/api/members",
        payment: "/api/payments",
        entry: "/api/entry",
    };
    return map[entityType] || "/api/members";
}

function getMethod(operation: string): string {
    const map: Record<string, string> = {
        create: "POST",
        update: "PUT",
        delete: "DELETE",
    };
    return map[operation] || "POST";
}
