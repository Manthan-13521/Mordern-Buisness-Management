"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

interface DeletePoolButtonProps {
    poolId: string;
    poolName: string;
}

export function DeletePoolButton({ poolId, poolName }: DeletePoolButtonProps) {
    const [loading, setLoading] = useState(false);

    const handleDelete = async () => {
        if (!confirm(`⚠️ Are you absolutely sure you want to delete "${poolName}"?\n\nThis will permanently delete ALL data including members, plans, staff, entry logs, and payments.\n\nThis action CANNOT be undone.`)) {
            return;
        }

        // Double confirm for safety
        if (!confirm(`Final confirmation: Delete "${poolName}" and all its data permanently?`)) {
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`/api/superadmin/pools/${poolId}`, {
                method: "DELETE",
            });

            if (res.ok) {
                alert(`Pool "${poolName}" deleted successfully`);
                window.location.reload();
            } else {
                const data = await res.json();
                alert(data.error || "Failed to delete pool");
            }
        } catch (err) {
            console.error(err);
            alert("Server error deleting pool");
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleDelete}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-400 bg-red-500/5 border border-red-500/10 hover:bg-red-500/15 hover:text-red-300 transition-all disabled:opacity-50 mt-2"
            title={`Delete pool ${poolName}`}
        >
            <Trash2 className="w-3.5 h-3.5" />
            {loading ? "Deleting..." : "Delete Pool"}
        </button>
    );
}
