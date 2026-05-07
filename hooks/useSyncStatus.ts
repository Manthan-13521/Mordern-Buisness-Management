"use client";

import { useState, useEffect, useCallback } from "react";
import { flushSyncQueue, getSyncQueueStatus, clearFailedOperations } from "@/lib/local-db/syncQueue";
import { db } from "@/lib/local-db/db";

/**
 * Hook: useSyncStatus
 * 
 * Provides real-time sync status with failed item visibility.
 * Automatically flushes sync queue when coming back online.
 * Surfaces permanently failed items so user can retry or acknowledge.
 */

export type SyncStatusType = "synced" | "syncing" | "offline" | "failed";

export function useSyncStatus() {
    const [status, setStatus] = useState<SyncStatusType>("synced");
    const [pending, setPending] = useState(0);
    const [failedCount, setFailedCount] = useState(0);

    const refreshStatus = useCallback(async () => {
        try {
            const queueStatus = await getSyncQueueStatus();
            setPending(queueStatus.pending);
            setFailedCount(queueStatus.failed);
            
            if (!navigator.onLine) {
                setStatus("offline");
            } else if (queueStatus.pending > 0) {
                setStatus("syncing");
            } else if (queueStatus.failed > 0) {
                setStatus("failed");
            } else {
                setStatus("synced");
            }
        } catch {
            // Dexie not available (SSR or private browsing)
        }
    }, []);

    const flush = useCallback(async () => {
        if (!navigator.onLine) return;
        setStatus("syncing");
        try {
            await flushSyncQueue();
            await refreshStatus();
        } catch {
            setStatus("failed");
        }
    }, [refreshStatus]);

    /**
     * Retry all permanently failed items:
     * 1. Reset retryCount to 0
     * 2. Set status back to "pending"
     * 3. Trigger immediate flush
     */
    const retryAll = useCallback(async () => {
        try {
            const failed = await db.syncQueue
                .where("status")
                .equals("failed_permanent")
                .toArray();

            for (const op of failed) {
                await db.syncQueue.update(op.id!, {
                    retryCount: 0,
                    status: "pending" as const,
                    lastTriedAt: undefined,
                });
            }

            // Trigger immediate flush
            await flush();
        } catch (err) {
            console.error("[SyncStatus] retryAll failed:", err);
        }
    }, [flush]);

    /**
     * Dismiss all permanently failed items (user acknowledges data loss).
     */
    const dismissFailed = useCallback(async () => {
        try {
            await clearFailedOperations();
            await refreshStatus();
        } catch {
            // Non-critical
        }
    }, [refreshStatus]);

    useEffect(() => {
        refreshStatus();

        // Poll every 10 seconds
        const interval = setInterval(refreshStatus, 10000);

        // Flush on reconnect
        const handleOnline = () => flush();
        const handleOffline = () => setStatus("offline");

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        return () => {
            clearInterval(interval);
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, [flush, refreshStatus]);

    return { status, pending, failedCount, flush, retryAll, dismissFailed, refreshStatus };
}
