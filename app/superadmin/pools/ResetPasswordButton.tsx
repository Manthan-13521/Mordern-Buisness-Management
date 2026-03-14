"use client";

import { useState } from "react";
import { KeyRound, RefreshCw } from "lucide-react";

export function ResetPasswordButton({ poolId, poolName }: { poolId: string; poolName: string }) {
    const [loading, setLoading] = useState(false);

    const handleReset = async () => {
        const confirmed = window.confirm(`Are you sure you want to forcibly reset the Pool Administrator password for ${poolName}? The existing password will be invalidated immediately.`);
        
        if (!confirmed) return;
        
        setLoading(true);
        try {
            const res = await fetch(`/api/superadmin/pools/${poolId}/reset-password`, {
                method: "POST"
            });
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.error || "Failed to reset password");
            
            // Because passwords are no longer stored in clear-text, this is the exact ONE TIME the Super Admin
            // is permitted to see the raw text string before it is lost to the hashing algorithm forever.
            alert(`SUCCESS! Please securely provide these unified credentials to the pool manager:\n\nEmail: ${data.adminEmail}\nNEW PASSWORD: ${data.newPassword}\n\nThis password will not be shown again.`);
            
        } catch (error: any) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleReset}
            disabled={loading}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white border border-neutral-700 transition"
        >
            {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin"/> : <KeyRound className="w-3.5 h-3.5 text-amber-500" />}
            Reset Password
        </button>
    );
}
