"use client";

import { useState } from "react";
import { KeyRound, RefreshCw, XCircle } from "lucide-react";
import { toast } from "react-hot-toast";

export function ResetPasswordButton({ poolId, poolName }: { poolId: string; poolName: string }) {
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [newPassword, setNewPassword] = useState("");
    const [showPass, setShowPass] = useState(false);

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword.length < 8) {
            toast.error("Password must be at least 8 characters");
            return;
        }
        
        setLoading(true);
        try {
            const res = await fetch(`/api/superadmin/pools/${poolId}/reset-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ newPassword })
            });
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.error || "Failed to reset password");
            
            toast.success("Password reset securely. All active sessions invalidated.");
            setIsOpen(false);
            setNewPassword("");
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                disabled={loading}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded bg-[#0b1220] text-[#9ca3af] hover:bg-neutral-700 hover:text-white border border-neutral-700 transition"
                title="Reset Admin Password"
            >
                <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                Reset Password
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => !loading && setIsOpen(false)} />
                    <div className="relative bg-[#0b1220] border border-[#1f2937] rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-[#1f2937] pb-3">
                            <h2 className="text-lg font-bold text-white tracking-tight">Reset Password</h2>
                            <button onClick={() => setIsOpen(false)} disabled={loading} className="text-[#6b7280] hover:text-[#f9fafb] transition-colors"><XCircle className="h-5 w-5" /></button>
                        </div>
                        <p className="text-sm text-[#6b7280] text-left">Setting new password for <span className="font-semibold text-white">{poolName}</span>.</p>
                        <form onSubmit={handleReset} className="space-y-4 pt-2 text-left">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">New Password</label>
                                <div className="relative">
                                    <input
                                        required
                                        type={showPass ? "text" : "password"}
                                        minLength={8}
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        placeholder="Min 8 characters"
                                        className="w-full rounded-xl border border-[#1f2937] bg-slate-950/50 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all"
                                    />
                                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b7280] hover:text-[#f9fafb]">
                                        <span className="text-xs font-semibold">{showPass ? "HIDE" : "SHOW"}</span>
                                    </button>
                                </div>
                            </div>
                            <button type="submit" disabled={loading}
                                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 border-0 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-orange-500/20 disabled:opacity-50">
                                {loading ? "Resetting…" : "Confirm Reset"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
