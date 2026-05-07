"use client";

import { useSyncStatus, SyncStatusType } from "@/hooks/useSyncStatus";

/**
 * Minimal sync status indicator for existing navbar/sidebar.
 * Shows colored dot + optional count for failed items.
 * 
 * Usage: <SyncIndicator /> — drop into Topbar or Sidebar.
 */

const statusConfig: Record<SyncStatusType, { color: string; label: string; animate?: boolean }> = {
    synced:  { color: "bg-green-500", label: "Synced" },
    syncing: { color: "bg-yellow-500", label: "Syncing…", animate: true },
    offline: { color: "bg-gray-400", label: "Offline" },
    failed:  { color: "bg-red-500", label: "Sync failed" },
};

export default function SyncIndicator() {
    const { status, failedCount, retryAll } = useSyncStatus();
    const config = statusConfig[status];

    return (
        <div className="flex items-center gap-2 text-xs">
            <span 
                className={`w-2 h-2 rounded-full ${config.color} ${config.animate ? "animate-pulse" : ""}`} 
                title={config.label} 
            />
            {status === "failed" && failedCount > 0 && (
                <button
                    onClick={retryAll}
                    className="text-red-400 hover:text-red-300 transition-colors text-[11px] font-medium"
                    title="Retry failed sync items"
                >
                    {failedCount} failed · Retry
                </button>
            )}
            {status === "offline" && (
                <span className="text-gray-400 text-[11px]">Offline</span>
            )}
        </div>
    );
}
