"use client";

import { useEffect, useState, useCallback } from "react";
import {
    Search, Plus, ShieldCheck, KeyRound, Play, Pause, XCircle, CheckCircle2, AlertTriangle, Info, Loader2, Trash2, Building2, UserCircle, ExternalLink
} from "lucide-react";
import Link from "next/link";
import { toast } from "react-hot-toast";

type Hostel = {
    hostelId: string; 
    hostelName: string; 
    slug: string; 
    city: string;
    adminEmail: string; 
    adminPhone?: string; 
    numberOfBlocks: number;
    status: string; 
    plan: string; 
    subscriptionStatus: string;
    isTwilioConnected: boolean; 
    createdAt: string; 
    memberCounter: number;
    stats?: {
        members: number;
        payments: number;
    };
};

export default function SuperAdminHostelsPage() {
    const [hostels, setHostels] = useState<Hostel[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);

    // Modals
    const [selectedHostel, setSelectedHostel] = useState<Hostel | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
    const [resetTarget, setResetTarget] = useState<Hostel | null>(null);
    const [newPassword, setNewPassword] = useState("");
    const [showPass, setShowPass] = useState(false);
    const [isActionLoading, setIsActionLoading] = useState(false);

    const limit = 20;

    const fetchHostels = useCallback(async () => {
        setLoading(true);
        try {
            const r = await fetch(`/api/superadmin/hostels?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`);
            const d = await r.json();
            if (r.ok) {
                setHostels(d.data || []);
                setTotal(d.total || 0);
            } else {
                toast.error(d.error || "Failed to load hostels");
            }
        } catch (error) {
            toast.error("Network error loading hostels");
        } finally {
            setLoading(false);
        }
    }, [page, search]);

    useEffect(() => { 
        fetchHostels(); 
    }, [fetchHostels]);

    const toggleStatus = async (h: Hostel) => {
        setIsActionLoading(true);
        try {
            const r = await fetch(`/api/superadmin/hostels/${h.hostelId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "toggle-status" }),
            });
            const d = await r.json();
            if (r.ok) {
                toast.success(`Hostel ${d.status === "ACTIVE" ? "resumed" : "suspended"} successfully`);
                fetchHostels();
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
            const r = await fetch(`/api/superadmin/hostels/${resetTarget.hostelId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "reset-password", newPassword }),
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

    const deleteHostel = async (hostelId: string) => {
        setIsActionLoading(true);
        try {
            const r = await fetch(`/api/superadmin/hostels/${hostelId}`, {
                method: "DELETE",
            });
            const d = await r.json();
            if (r.ok) {
                toast.success("Hostel and all data deleted permanently");
                fetchHostels();
                setShowDeleteModal(null);
            } else {
                toast.error(d.error || "Failed to delete hostel");
            }
        } catch (error) {
            toast.error("Network error deleting hostel");
        } finally {
            setIsActionLoading(false);
        }
    };

    const fetchDetails = async (h: Hostel) => {
        try {
            const r = await fetch(`/api/superadmin/hostels/${h.hostelId}`);
            const d = await r.json();
            if (r.ok) {
                setSelectedHostel(d);
            } else {
                toast.error(d.error || "Failed to load hostel details");
            }
        } catch (error) {
            toast.error("Failed to load details");
        }
    };

    const totalPages = Math.ceil(total / limit);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white flex items-center gap-3">
                        <Building2 className="h-8 w-8 text-rose-500" />
                        Hostel Management
                    </h1>
                    <p className="text-[#9ca3af] mt-1">Manage SaaS hostel tenants, monitor activity, and control access.</p>
                </div>
                
                <a href="/hostel/register?admin=true" className="bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 border-0 text-white px-4 py-2 font-bold rounded-xl shadow-lg transition flex items-center gap-2 whitespace-nowrap">
                    <Plus className="w-5 h-5"/> Add Hostel manually
                </a>
                
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6b7280]" />
                    <input 
                        type="text" 
                        placeholder="Search hostels..." 
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                        className="bg-[#0b1220] border border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 w-full md:w-80 text-sm focus:ring-2 focus:ring-[#8b5cf6] focus:outline-none transition-all"
                    />
                </div>
            </div>

            {/* Hostel Table */}
            <div className="bg-[#0b1220]/50 border border-neutral-800 rounded-2xl overflow-hidden backdrop-blur-sm shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#0b1220]/50 text-[#9ca3af] text-xs uppercase tracking-wider font-bold border-b border-neutral-800">
                                <th className="px-6 py-4">Hostel Info</th>
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
                                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-rose-500" />
                                        <p className="text-[#6b7280] mt-2 text-sm">Loading hostels...</p>
                                    </td>
                                </tr>
                            ) : hostels.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center">
                                        <div className="bg-[#0b1220]/50 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Building2 className="h-8 w-8 text-neutral-600" />
                                        </div>
                                        <p className="text-[#9ca3af] font-medium">No hostels found</p>
                                        <p className="text-[#6b7280] text-sm mt-1">Try adjusting your search criteria</p>
                                    </td>
                                </tr>
                            ) : hostels.map(h => (
                                <tr key={h.hostelId} className="hover:bg-[#8b5cf6]/5 transition-colors group">
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-rose-500/20 to-orange-500/20 flex items-center justify-center border border-[#1f2937] font-bold text-rose-400">
                                                {(h.hostelName || "U").charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-bold text-[#f9fafb]">{h.hostelName || "Unknown"}</div>
                                                <div className="text-xs text-[#6b7280] font-mono">{h.hostelId} • /{h.slug}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2 text-sm text-[#9ca3af]">
                                                <UserCircle className="h-3.5 w-3.5 text-[#6b7280]" />
                                                {h.adminEmail}
                                            </div>
                                            <div className="text-xs text-[#6b7280]">{h.adminPhone || "No phone provided"}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        {h.status === "ACTIVE" ? (
                                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-bold border border-emerald-500/20 max-w-max">
                                                <CheckCircle2 className="h-3 w-3" /> Active
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-500 text-xs font-bold border border-orange-500/20 max-w-max">
                                                <XCircle className="h-3 w-3" /> Suspended
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="text-sm text-[#9ca3af]">
                                            {h.createdAt ? new Date(h.createdAt).toLocaleDateString() : "Just Now"}
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => fetchDetails(h)}
                                                className="p-2 hover:bg-[#8b5cf6]/10 rounded-lg text-[#9ca3af] hover:text-[#f9fafb] transition-all shadow-sm"
                                                title="View Details"
                                            >
                                                <Info className="h-4 w-4" />
                                            </button>
                                            <button 
                                                onClick={() => { setResetTarget(h); setNewPassword(""); setShowPass(false); }}
                                                className="p-2 hover:bg-[#0b1220] rounded-lg text-[#9ca3af] hover:text-[#f9fafb] transition-all shadow-sm"
                                                title="Reset Admin Password"
                                                disabled={isActionLoading}
                                            >
                                                <KeyRound className="h-4 w-4" />
                                            </button>
                                            <button 
                                                onClick={() => toggleStatus(h)}
                                                className={`p-2 hover:bg-[#8b5cf6]/10 rounded-lg transition-all shadow-sm ${h.status === "ACTIVE" ? "text-orange-400" : "text-emerald-400"}`}
                                                title={h.status === "ACTIVE" ? "Suspend Hostel" : "Resume Hostel"}
                                                disabled={isActionLoading}
                                            >
                                                {h.status === "ACTIVE" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                            </button>
                                            <button 
                                                onClick={() => setShowDeleteModal(h.hostelId)}
                                                className="p-2 hover:bg-rose-500/10 rounded-lg text-rose-400 hover:text-rose-400 transition-all shadow-sm"
                                                title="Delete Hostel"
                                                disabled={isActionLoading}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                            <a 
                                                href={`/hostel/${h.slug}/admin`}
                                                target="_blank"
                                                className="p-2 hover:bg-[#8b5cf6]/10 rounded-lg text-rose-400 hover:text-rose-300 transition-all shadow-sm"
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

                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-800 text-sm text-[#6b7280]">
                        <span>{total} hostels</span>
                        <div className="flex gap-2">
                            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 rounded-xl bg-[#0b1220] hover:bg-neutral-800 text-white disabled:opacity-40 transition-all">Previous</button>
                            <span className="px-3 py-1.5 font-semibold text-white">Page {page} of {totalPages}</span>
                            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 rounded-xl bg-[#0b1220] hover:bg-neutral-800 text-white disabled:opacity-40 transition-all">Next</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Details Modal */}
            {selectedHostel && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-[#0b1220] border border-neutral-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl overflow-y-auto max-h-[90vh]">
                        <div className="bg-gradient-to-br from-rose-600/20 to-orange-600/20 p-8 border-b border-neutral-800 relative">
                            <button 
                                onClick={() => setSelectedHostel(null)}
                                className="absolute top-6 right-6 p-2 hover:bg-[#8b5cf6]/10 rounded-full transition-all"
                            >
                                <XCircle className="h-6 w-6 text-[#9ca3af] hover:text-[#f9fafb]" />
                            </button>
                            <div className="h-16 w-16 rounded-2xl bg-[#0b1220] border border-[#1f2937] flex items-center justify-center mb-4">
                                <Building2 className="h-10 w-10 text-rose-400" />
                            </div>
                            <h2 className="text-2xl font-black text-white">{selectedHostel.hostelName}</h2>
                            <p className="text-[#9ca3af] font-mono text-sm leading-relaxed">/{selectedHostel.slug}</p>
                        </div>
                        
                        <div className="p-8 space-y-8">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-[#0b1220]/50 p-6 rounded-2xl border border-[#1f2937]">
                                    <p className="text-xs font-bold text-[#6b7280] uppercase tracking-widest mb-1">Residents</p>
                                    <p className="text-3xl font-black text-white">{selectedHostel.stats?.members ?? 0}</p>
                                </div>
                                <div className="bg-[#0b1220]/50 p-6 rounded-2xl border border-[#1f2937]">
                                    <p className="text-xs font-bold text-[#6b7280] uppercase tracking-widest mb-1">Payments</p>
                                    <p className="text-3xl font-black text-white">{selectedHostel.stats?.payments ?? 0}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between py-3 border-b border-neutral-800 text-sm">
                                    <span className="text-[#6b7280] font-medium">Hostel ID</span>
                                    <span className="text-[#9ca3af] font-mono">{selectedHostel.hostelId}</span>
                                </div>
                                <div className="flex items-center justify-between py-3 border-b border-neutral-800 text-sm">
                                    <span className="text-[#6b7280] font-medium">Blocks Count</span>
                                    <span className="text-[#9ca3af]">{selectedHostel.numberOfBlocks || 0} Block(s)</span>
                                </div>
                                <div className="flex items-center justify-between py-3 border-b border-neutral-800 text-sm">
                                    <span className="text-[#6b7280] font-medium">Admin Email</span>
                                    <span className="text-[#9ca3af]">{selectedHostel.adminEmail}</span>
                                </div>
                                <div className="flex items-center justify-between py-3 border-b border-neutral-800 text-sm">
                                    <span className="text-[#6b7280] font-medium">City</span>
                                    <span className="text-[#9ca3af]">{selectedHostel.city || "N/A"}</span>
                                </div>
                                <div className="flex items-center justify-between py-3 border-b border-neutral-800 text-sm">
                                    <span className="text-[#6b7280] font-medium">Join Date</span>
                                    <span className="text-[#9ca3af]">{selectedHostel.createdAt ? new Date(selectedHostel.createdAt).toLocaleDateString() : "N/A"}</span>
                                </div>
                                <div className="flex items-center justify-between py-3 border-b border-neutral-800 text-sm">
                                    <span className="text-[#6b7280] font-medium">Contact Phone</span>
                                    <span className="text-[#9ca3af]">{selectedHostel.adminPhone || "N/A"}</span>
                                </div>
                            </div>

                            <button 
                                onClick={() => setSelectedHostel(null)}
                                className="w-full py-4 text-sm font-bold bg-[#0b1220] hover:bg-neutral-700 text-white rounded-2xl transition-all border border-[#1f2937] shadow-inner"
                            >
                                Close View
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cascade Delete Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in zoom-in-95 duration-200">
                    <div className="bg-[#0b1220] border border-rose-500/20 rounded-3xl w-full max-w-md p-8 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-rose-500/50" />
                        <div className="h-16 w-16 rounded-2xl bg-rose-500/10 flex items-center justify-center mb-6 border border-rose-500/20">
                            <AlertTriangle className="h-10 w-10 text-rose-400" />
                        </div>
                        <h2 className="text-2xl font-black text-white">Permanent Deletion</h2>
                        <p className="text-[#9ca3af] mt-3 text-sm leading-relaxed">
                            This action will **completely purge** this hostel and all its associated data including:
                        </p>
                        <ul className="mt-4 space-y-2 text-xs text-[#6b7280] font-medium list-disc list-inside">
                            <li>Hostel Blocks, Floors & Rooms Layout</li>
                            <li>Resident Profiles & Renewal History</li>
                            <li>Staff Records & Attendance Logs</li>
                            <li>Fee Ledgers & Synced Access Accounts</li>
                        </ul>
                        <div className="bg-rose-500/5 p-4 rounded-xl border border-rose-500/10 mt-6 text-rose-400 text-xs font-bold flex items-center gap-2">
                            <Info className="h-4 w-4 shrink-0" /> IRREVERSIBLE ACTION
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 mt-8">
                            <button 
                                onClick={() => setShowDeleteModal(null)}
                                className="py-3.5 text-sm font-bold bg-[#0b1220] hover:bg-neutral-700 text-white rounded-xl transition-all"
                                disabled={isActionLoading}
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={() => deleteHostel(showDeleteModal)}
                                className="py-3.5 text-sm font-bold bg-red-700 hover:bg-red-600 text-white rounded-xl transition-all shadow-lg shadow-red-900/20 flex items-center justify-center gap-2 disabled:opacity-50"
                                disabled={isActionLoading}
                            >
                                {isActionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete System"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reset Password Modal */}
            {resetTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => !isActionLoading && setResetTarget(null)} />
                    <div className="relative bg-[#0b1220] border border-[#1f2937] rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-[#1f2937] pb-3">
                            <h2 className="text-lg font-bold text-white tracking-tight">Reset Password</h2>
                            <button onClick={() => setResetTarget(null)} disabled={isActionLoading} className="text-[#6b7280] hover:text-[#f9fafb] transition-colors"><XCircle className="h-5 w-5" /></button>
                        </div>
                        <p className="text-sm text-[#6b7280]">Setting new password for <span className="font-semibold text-white">{resetTarget.hostelName}</span> ({resetTarget.adminEmail}).</p>
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
