"use client";

import { useState, useEffect, useCallback } from "react";
import { flushSyncQueue, getSyncQueueStatus } from "@/lib/local-db/syncQueue";

/**
 * Hook: useSyncStatus
 * 
 * Provides real-time sync status for offline indicator UI.
 * Automatically flushes sync queue when coming back online.
 * 
 * Usage:
 *   const { status, pending, flush } = useSyncStatus();
 *   // status: "synced" | "syncing" | "offline" | "error"
 */

export type SyncStatusType = "synced" | "syncing" | "offline" | "error";

export function useSyncStatus() {
    const [status, setStatus] = useState<SyncStatusType>("synced");
    const [pending, setPending] = useState(0);
    const [failed, setFailed] = useState(0);

    const refreshStatus = useCallback(async () => {
        try {
            const queueStatus = await getSyncQueueStatus();
            setPending(queueStatus.pending);
            setFailed(queueStatus.failed);
            
            if (!navigator.onLine) {
                setStatus("offline");
            } else if (queueStatus.pending > 0) {
                setStatus("syncing");
            } else if (queueStatus.failed > 0) {
                setStatus("error");
            } else {
                setStatus("synced");
            }
        } catch {
            // Dexie not available
        }
    }, []);

    const flush = useCallback(async () => {
        if (!navigator.onLine) return;
        setStatus("syncing");
        try {
            await flushSyncQueue();
            await refreshStatus();
        } catch {
            setStatus("error");
        }
    }, [refreshStatus]);

    useEffect(() => {
        refreshStatus();

        // Poll every 10 seconds
        const interval = setInterval(refreshStatus, 10000);

        // Flush on reconnect
        const handleOnline = () => {
            flush();
        };
        const handleOffline = () => {
            setStatus("offline");
        };

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        return () => {
            clearInterval(interval);
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, [flush, refreshStatus]);

    return { status, pending, failed, flush, refreshStatus };
}
