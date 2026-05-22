"use client";

import { useEffect, useState, useCallback } from "react";
import {
    Search, Plus, ShieldCheck, KeyRound, Play, Pause, XCircle, CheckCircle2, AlertTriangle, Info, Loader2, Trash2, Droplets, UserCircle, ExternalLink
} from "lucide-react";
import Link from "next/link";
import { toast } from "react-hot-toast";

type Pool = {
    _id: string; 
    poolId: string; 
    poolName: string; 
    slug: string; 
    city: string;
    adminEmail: string; 
    adminPhone?: string; 
    status: string; 
    subscriptionStatus: string;
    createdAt: string; 
    stats?: {
        members: number;
        payments: number;
    };
};

export default function SuperAdminPoolsPage() {
    const [pools, setPools] = useState<Pool[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);

    // Modals
    const [selectedPool, setSelectedPool] = useState<Pool | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
    const [resetTarget, setResetTarget] = useState<Pool | null>(null);
    const [newPassword, setNewPassword] = useState("");
    const [showPass, setShowPass] = useState(false);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [deleteConfirmationText, setDeleteConfirmationText] = useState("");

    const fetchPools = useCallback(async () => {
        setLoading(true);
        try {
            const r = await fetch(`/api/superadmin/pools`);
            const d = await r.json();
            if (r.ok) {
                setPools(d || []);
            } else {
                toast.error(d.error || "Failed to load pools");
            }
        } catch (error) {
            toast.error("Network error loading pools");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { 
        fetchPools(); 
    }, [fetchPools]);

    const toggleStatus = async (p: Pool) => {
        setIsActionLoading(true);
        try {
            const r = await fetch(`/api/superadmin/pools/${p.poolId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "toggle-status" }),
            });
            const d = await r.json();
            if (r.ok) {
                toast.success(`Pool ${d.status === "paused" ? "paused" : "resumed"} successfully`);
                fetchPools();
            } else {
                toast.error(d.error || "Failed to toggle status");
            }
        } catch (error) {
            toast.error("Network error toggling status");
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!resetTarget) return;
        if (newPassword.length < 8) {
            toast.error("Password must be at least 8 characters");
            return;
        }
        setIsActionLoading(true);
        try {
            const r = await fetch(`/api/superadmin/pools/${resetTarget.poolId}/reset-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ newPassword }),
            });
            const d = await r.json();
            if (r.ok) {
                toast.success("Password reset securely. All active sessions invalidated.");
                setResetTarget(null);
                setNewPassword("");
            } else {
                toast.error(d.error || "Failed to reset password");
            }
        } catch (error) {
            toast.error("Network error resetting password");
        } finally {
            setIsActionLoading(false);
        }
    };

    const deletePool = async (poolId: string, confirmationText: string) => {
        setIsActionLoading(true);
        try {
            const r = await fetch(`/api/superadmin/pools/${poolId}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ confirmationText })
            });
            const d = await r.json();
            if (r.ok) {
                toast.success("Pool and all data deleted permanently");
                fetchPools();
                setShowDeleteModal(null);
                setDeleteConfirmationText("");
            } else {
                toast.error(d.error || "Failed to delete pool");
            }
        } catch (error) {
            toast.error("Network error deleting pool");
        } finally {
            setIsActionLoading(false);
        }
    };

    const fetchDetails = async (p: Pool) => {
        try {
            const r = await fetch(`/api/superadmin/pools/${p.poolId}`);
            const d = await r.json();
            if (r.ok) {
                setSelectedPool(d);
            } else {
                toast.error(d.error || "Failed to load pool details");
            }
        } catch (error) {
            toast.error("Failed to load details");
        }
    };

    const filteredPools = pools.filter(p => 
        (p.poolName || "").toLowerCase().includes(search.toLowerCase()) || 
        (p.slug || "").toLowerCase().includes(search.toLowerCase()) ||
        (p.adminEmail || "").toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white flex items-center gap-3">
                        <Droplets className="h-8 w-8 text-cyan-500" />
                        Pool Management
                    </h1>
                    <p className="text-[#9ca3af] mt-1">Manage SaaS pool tenants, monitor activity, and control access.</p>
                </div>
                
                <Link href="/subscribe?admin=true" className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 border-0 text-white px-4 py-2 font-bold rounded-xl shadow-lg transition flex items-center gap-2 whitespace-nowrap">
                    <Plus className="w-5 h-5"/> Add Pool manually
                </Link>
                
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6b7280]" />
                    <input 
                        type="text" 
                        placeholder="Search pools..." 
                        value={search}
                        onChange={e => { setSearch(e.target.value); }}
                        className="bg-[#0b1220] border border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 w-full md:w-80 text-sm focus:ring-2 focus:ring-[#8b5cf6] focus:outline-none transition-all"
                    />
                </div>
            </div>

            {/* Pool Table */}
            <div className="bg-[#0b1220]/50 border border-neutral-800 rounded-2xl overflow-hidden backdrop-blur-sm shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#0b1220]/50 text-[#9ca3af] text-xs uppercase tracking-wider font-bold border-b border-neutral-800">
                                <th className="px-6 py-4">Pool Info</th>
                                <th className="px-6 py-4">Contact & Admin</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Registered</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-800/50">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center">
                                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-cyan-500" />
                                        <p className="text-[#6b7280] mt-2 text-sm">Loading pools...</p>
                                    </td>
                                </tr>
                            ) : filteredPools.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center">
                                        <div className="bg-[#0b1220]/50 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Droplets className="h-8 w-8 text-neutral-600" />
                                        </div>
                                        <p className="text-[#9ca3af] font-medium">No pools found</p>
                                        <p className="text-[#6b7280] text-sm mt-1">Try adjusting your search criteria</p>
                                    </td>
                                </tr>
                            ) : filteredPools.map(p => (
                                <tr key={p.poolId} className="hover:bg-[#8b5cf6]/5 transition-colors group">
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center border border-[#1f2937] font-bold text-cyan-400">
                                                {(p.poolName || "U").charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-bold text-[#f9fafb]">{p.poolName || "Unknown"}</div>
                                                <div className="text-xs text-[#6b7280] font-mono">{p.poolId} • /{p.slug}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2 text-sm text-[#9ca3af]">
                                                <UserCircle className="h-3.5 w-3.5 text-[#6b7280]" />
                                                {p.adminEmail}
                                            </div>
                                            <div className="text-xs text-[#6b7280]">{p.adminPhone || "No phone provided"}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        {p.subscriptionStatus !== "paused" && p.status !== "PAUSED" ? (
                                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-bold border border-emerald-500/20 max-w-max">
                                                <CheckCircle2 className="h-3 w-3" /> Active
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-500 text-xs font-bold border border-orange-500/20 max-w-max">
                                                <XCircle className="h-3 w-3" /> Paused
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="text-sm text-[#9ca3af]">
                                            {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "Just Now"}
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => fetchDetails(p)}
                                                className="p-2 hover:bg-[#8b5cf6]/10 rounded-lg text-[#9ca3af] hover:text-[#f9fafb] transition-all shadow-sm"
                                                title="View Details"
                                            >
                                                <Info className="h-4 w-4" />
                                            </button>
                                            <button 
                                                onClick={() => { setResetTarget(p); setNewPassword(""); setShowPass(false); }}
                                                className="p-2 hover:bg-[#0b1220] rounded-lg text-[#9ca3af] hover:text-[#f9fafb] transition-all shadow-sm"
                                                title="Reset Admin Password"
                                                disabled={isActionLoading}
                                            >
                                                <KeyRound className="h-4 w-4" />
                                            </button>
                                            <button 
                                                onClick={() => toggleStatus(p)}
                                                className={`p-2 hover:bg-[#8b5cf6]/10 rounded-lg transition-all shadow-sm ${p.subscriptionStatus !== "paused" ? "text-orange-400" : "text-emerald-400"}`}
                                                title={p.subscriptionStatus !== "paused" ? "Pause Pool" : "Resume Pool"}
                                                disabled={isActionLoading}
                                            >
                                                {p.subscriptionStatus !== "paused" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                            </button>
                                            <button 
                                                onClick={() => { setShowDeleteModal(p.poolId); setDeleteConfirmationText(""); }}
                                                className="p-2 hover:bg-rose-500/10 rounded-lg text-rose-400 hover:text-rose-400 transition-all shadow-sm"
                                                title="Delete Pool"
                                                disabled={isActionLoading}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                            <a 
                                                href={`/pool/${p.slug}/admin`}
                                                target="_blank"
                                                className="p-2 hover:bg-[#8b5cf6]/10 rounded-lg text-cyan-400 hover:text-cyan-300 transition-all shadow-sm"
                                                title="Open Dashboard"
                                            >
                                                <ExternalLink className="h-4 w-4" />
                                            </a>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Details Modal */}
            {selectedPool && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-[#0b1220] border border-neutral-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl overflow-y-auto max-h-[90vh]">
                        <div className="bg-gradient-to-br from-cyan-600/20 to-blue-600/20 p-8 border-b border-neutral-800 relative">
                            <button 
                                onClick={() => setSelectedPool(null)}
                                className="absolute top-6 right-6 p-2 hover:bg-[#8b5cf6]/10 rounded-full transition-all"
                            >
                                <XCircle className="h-6 w-6 text-[#9ca3af] hover:text-[#f9fafb]" />
                            </button>
                            <div className="h-16 w-16 rounded-2xl bg-[#0b1220] border border-[#1f2937] flex items-center justify-center mb-4">
                                <Droplets className="h-10 w-10 text-cyan-400" />
                            </div>
                            <h2 className="text-2xl font-black text-white">{selectedPool.poolName}</h2>
                            <p className="text-[#9ca3af] font-mono text-sm leading-relaxed">/{selectedPool.slug}</p>
                        </div>
                        
                        <div className="p-8 space-y-8">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-[#0b1220]/50 p-6 rounded-2xl border border-[#1f2937]">
                                    <p className="text-xs font-bold text-[#6b7280] uppercase tracking-widest mb-1">Members</p>
                                    <p className="text-3xl font-black text-white">{selectedPool.stats?.members ?? 0}</p>
                                </div>
                                <div className="bg-[#0b1220]/50 p-6 rounded-2xl border border-[#1f2937]">
                                    <p className="text-xs font-bold text-[#6b7280] uppercase tracking-widest mb-1">Payments</p>
                                    <p className="text-3xl font-black text-white">{selectedPool.stats?.payments ?? 0}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between py-3 border-b border-neutral-800 text-sm">
                                    <span className="text-[#6b7280] font-medium">Pool ID</span>
                                    <span className="text-[#9ca3af] font-mono">{selectedPool.poolId}</span>
                                </div>
                                <div className="flex items-center justify-between py-3 border-b border-neutral-800 text-sm">
                                    <span className="text-[#6b7280] font-medium">Admin Email</span>
                                    <span className="text-[#9ca3af]">{selectedPool.adminEmail}</span>
                                </div>
                                <div className="flex items-center justify-between py-3 border-b border-neutral-800 text-sm">
                                    <span className="text-[#6b7280] font-medium">City</span>
                                    <span className="text-[#9ca3af]">{selectedPool.city || "N/A"}</span>
                                </div>
                                <div className="flex items-center justify-between py-3 border-b border-neutral-800 text-sm">
                                    <span className="text-[#6b7280] font-medium">Join Date</span>
                                    <span className="text-[#9ca3af]">{selectedPool.createdAt ? new Date(selectedPool.createdAt).toLocaleDateString() : "N/A"}</span>
                                </div>
                                <div className="flex items-center justify-between py-3 border-b border-neutral-800 text-sm">
                                    <span className="text-[#6b7280] font-medium">Contact Phone</span>
                                    <span className="text-[#9ca3af]">{selectedPool.adminPhone || "N/A"}</span>
                                </div>
                            </div>

                            <button 
                                onClick={() => setSelectedPool(null)}
                                className="w-full py-4 text-sm font-bold bg-[#0b1220] hover:bg-neutral-700 text-white rounded-2xl transition-all border border-[#1f2937] shadow-inner"
                            >
                                Close View
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cascade Delete Modal */}
            {showDeleteModal && (() => {
                const poolToDelete = pools.find(p => p.poolId === showDeleteModal);
                if (!poolToDelete) return null;
                const expectedConfirmation = `delete ${poolToDelete.poolName}`;
                const isValid = deleteConfirmationText === expectedConfirmation;

                return (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in zoom-in-95 duration-200">
                    <div className="bg-[#0b1220] border border-rose-500/20 rounded-3xl w-full max-w-md p-8 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-rose-500/50" />
                        <div className="h-16 w-16 rounded-2xl bg-rose-500/10 flex items-center justify-center mb-6 border border-rose-500/20">
                            <AlertTriangle className="h-10 w-10 text-rose-400" />
                        </div>
                        <h2 className="text-2xl font-black text-white">Permanent Deletion</h2>
                        <p className="text-[#9ca3af] mt-3 text-sm leading-relaxed">
                            This action will **completely purge** this pool and all its associated data including:
                        </p>
                        <ul className="mt-4 space-y-2 text-xs text-[#6b7280] font-medium list-disc list-inside">
                            <li>Pool Members & Attendance Records</li>
                            <li>Plans, Subscriptions & Payment Transactions</li>
                            <li>Entry Logs & Revenue Analytics</li>
                            <li>Access Accounts for Admins/Operators</li>
                        </ul>
                        <div className="bg-rose-500/5 p-4 rounded-xl border border-rose-500/10 mt-6 text-rose-400 text-xs font-bold flex items-center gap-2">
                            <Info className="h-4 w-4 shrink-0" /> IRREVERSIBLE ACTION
                        </div>
                        
                        <div className="mt-6 space-y-2">
                            <label className="block text-xs font-bold text-slate-400 mb-1.5">
                                Type <span className="text-rose-400 select-all font-mono bg-rose-500/10 px-1 py-0.5 rounded">{expectedConfirmation}</span> to confirm.
                            </label>
                            <input
                                type="text"
                                value={deleteConfirmationText}
                                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                                onPaste={(e) => e.preventDefault()}
                                placeholder={expectedConfirmation}
                                className="w-full rounded-xl border border-rose-500/30 bg-[#020617] px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all font-mono"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-8">
                            <button 
                                onClick={() => { setShowDeleteModal(null); setDeleteConfirmationText(""); }}
                                className="py-3.5 text-sm font-bold bg-[#0b1220] hover:bg-neutral-700 text-white rounded-xl transition-all disabled:opacity-50"
                                disabled={isActionLoading}
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={() => isValid && deletePool(showDeleteModal, deleteConfirmationText)}
                                className="py-3.5 text-sm font-bold bg-red-700 hover:bg-red-600 text-white rounded-xl transition-all shadow-lg shadow-red-900/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:bg-red-700 disabled:cursor-not-allowed"
                                disabled={isActionLoading || !isValid}
                            >
                                {isActionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete System"}
                            </button>
                        </div>
                    </div>
                </div>
                );
            })()}

            {/* Reset Password Modal */}
            {resetTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => !isActionLoading && setResetTarget(null)} />
                    <div className="relative bg-[#0b1220] border border-[#1f2937] rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-[#1f2937] pb-3">
                            <h2 className="text-lg font-bold text-white tracking-tight">Reset Password</h2>
                            <button onClick={() => setResetTarget(null)} disabled={isActionLoading} className="text-[#6b7280] hover:text-[#f9fafb] transition-colors"><XCircle className="h-5 w-5" /></button>
                        </div>
                        <p className="text-sm text-[#6b7280]">Setting new password for <span className="font-semibold text-white">{resetTarget.poolName}</span> ({resetTarget.adminEmail}).</p>
                        <form onSubmit={handleResetPassword} className="space-y-4 pt-2">
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
                            <button type="submit" disabled={isActionLoading}
                                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 border-0 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-orange-500/20 disabled:opacity-50">
                                {isActionLoading ? "Resetting…" : "Confirm Reset"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
