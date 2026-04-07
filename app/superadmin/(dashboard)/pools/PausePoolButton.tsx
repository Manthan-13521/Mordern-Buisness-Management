"use client";

import { useState } from "react";
import { Pause, Play } from "lucide-react";
import { useRouter } from "next/navigation";

export function PausePoolButton({ poolId, currentStatus }: { poolId: string, currentStatus: string }) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const isPaused = currentStatus === "paused";

    const togglePause = async () => {
        if (!confirm(`Are you sure you want to ${isPaused ? "resume" : "pause"} the subscription for this pool?`)) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/super-admin/pools/${poolId}/subscription`, {
                method: "PATCH",
                body: JSON.stringify({ status: isPaused ? "active" : "paused" }),
                headers: { "Content-Type": "application/json" }
            });
            if (res.ok) {
                router.refresh();
            } else {
                alert("Failed to update status");
            }
        } catch (e) {
            console.error(e);
            alert("Error updating status");
        } finally {
            setLoading(false);
        }
    }

    return (
        <button 
            onClick={togglePause} 
            disabled={loading} 
            className={`mt-2 text-xs font-semibold px-2 py-1.5 rounded-lg border shadow-sm transition flex items-center gap-1.5 w-max disabled:opacity-50 ${isPaused ? 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border-emerald-500/30' : 'bg-amber-600/20 hover:bg-amber-600/30 text-amber-500 border-amber-500/30'}`}
        >
            {loading ? (
                <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
            ) : isPaused ? (
                <Play className="w-3.5 h-3.5" />
            ) : (
                <Pause className="w-3.5 h-3.5" />
            )}
            {isPaused ? "Resume Subscription" : "Pause Subscription"}
        </button>
    );
}
