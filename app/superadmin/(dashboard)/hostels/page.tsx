"use client";

import { useEffect, useState, useCallback } from "react";
import {
    Search, Plus, ShieldCheck, KeyRound, Play, Pause, X, CheckCircle, AlertCircle, RefreshCw, Trash2
} from "lucide-react";
import Link from "next/link";

type Hostel = {
    hostelId: string; hostelName: string; slug: string; city: string;
    adminEmail: string; adminPhone?: string; numberOfBlocks: number;
    status: string; plan: string; subscriptionStatus: string;
    isTwilioConnected: boolean; createdAt: string; memberCounter: number;
};

const INPUT = "bg-slate-950/50 border border-[#1f2937] text-white text-sm rounded-xl focus:ring-[#8b5cf6] focus:border-blue-500 block w-full pl-9 p-2.5 placeholder-slate-500 transition-all";
const MODAL_INPUT = "w-full rounded-xl border border-[#1f2937] bg-slate-950/50 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all";
const LABEL = "block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider";

export default function SuperAdminHostelsPage() {
    const [hostels, setHostels] = useState<Hostel[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);

    // Reset password modal
    const [resetTarget, setResetTarget] = useState<Hostel | null>(null);
    const [newPassword, setNewPassword] = useState("");
    const [showPass, setShowPass] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const limit = 20;

    const fetchHostels = useCallback(async () => {
        setLoading(true);
        const r = await fetch(`/api/superadmin/hostels?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`);
        const d = await r.json();
        setHostels(d.data || []);
        setTotal(d.total || 0);
        setLoading(false);
    }, [page, search]);

    useEffect(() => { fetchHostels(); }, [fetchHostels]);

    const toggleStatus = async (h: Hostel) => {
        if (!confirm(`${h.status === "ACTIVE" ? "Suspend" : "Activate"} ${h.hostelName}?`)) return;
        const r = await fetch(`/api/superadmin/hostels/${h.hostelId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "toggle-status" }),
        });
        const d = await r.json();
        if (!r.ok) { setMessage({ type: "error", text: d.error }); return; }
        setMessage({ type: "success", text: `${h.hostelName} is now ${d.status === "ACTIVE" ? "active" : "suspended"}` });
        fetchHostels();
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!resetTarget) return;
        setSubmitting(true); setMessage(null);
        const r = await fetch(`/api/superadmin/hostels/${resetTarget.hostelId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "reset-password", newPassword }),
        });
        const d = await r.json();
        if (!r.ok) { setMessage({ type: "error", text: d.error }); setSubmitting(false); return; }
        setMessage({ type: "success", text: `Password reset for ${resetTarget.hostelName}. All sessions invalidated.` });
        setResetTarget(null); setNewPassword(""); setSubmitting(false);
    };

    const handleDelete = async (h: Hostel) => {
        if (!confirm(`Are you absolutely sure you want to delete ${h.hostelName}? This action is irreversible and will delete all associated data.`)) return;
        
        try {
            const r = await fetch(`/api/superadmin/hostels/${h.hostelId}`, {
                method: "DELETE",
            });
            const d = await r.json();
            
            if (!r.ok) {
                setMessage({ type: "error", text: d.error || "Failed to delete hostel" });
                return;
            }
            
            setMessage({ type: "success", text: d.message });
            fetchHostels();
        } catch (error: any) {
            setMessage({ type: "error", text: "Server error deleting hostel" });
        }
    };

    const totalPages = Math.ceil(total / limit);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Manage Tenants</h1>
                    <p className="text-[#6b7280]">View, monitor, and provision hostels across the platform.</p>
                </div>
                <a href="/hostel/register" target="_blank" rel="noopener noreferrer" className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 border-0 text-white px-4 py-2 font-bold rounded-xl shadow-lg transition flex items-center gap-2">
                    <Plus className="w-5 h-5"/> Add Hostel manually
                </a>
            </div>

            {message && (
                <div className={`flex items-start gap-3 rounded-xl p-4 border text-sm ${message.type === "success" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
                    {message.type === "success" ? <CheckCircle className="h-5 w-5 flex-shrink-0" /> : <AlertCircle className="h-5 w-5 flex-shrink-0" />}
                    <p>{message.text}</p>
                    <button onClick={() => setMessage(null)} className="ml-auto"><X className="h-4 w-4" /></button>
                </div>
            )}

            <div className="bg-slate-900 border border-[#1f2937] rounded-2xl overflow-hidden mt-8 shadow-2xl">
                <div className="bg-[#0b1220] p-4 border-b border-[#1f2937] flex items-center justify-between">
                    <div className="relative w-full max-w-sm flex items-center gap-2">
                        <div className="relative w-full">
                            <Search className="w-4 h-4 text-[#6b7280] absolute left-3 top-1/2 -translate-y-1/2"/>
                            <input 
                                type="text" 
                                placeholder="Search hostels..." 
                                value={search}
                                onChange={e => { setSearch(e.target.value); setPage(1); }}
                                className={INPUT}
                            />
                        </div>
                        <button onClick={fetchHostels} className="p-2.5 rounded-xl border border-[#1f2937] hover:bg-[#0b1220] transition-all">
                            <RefreshCw className="h-4 w-4 text-slate-400 cursor-pointer" />
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-400">
                        <thead className="text-xs text-[#6b7280] uppercase bg-slate-950/50">
                            <tr>
                                <th scope="col" className="px-6 py-4">Hostel Name</th>
                                <th scope="col" className="px-6 py-4">Domain/Slug</th>
                                <th scope="col" className="px-6 py-4">Status</th>
                                <th scope="col" className="px-6 py-4">Admin Credentials</th>
                                <th scope="col" className="px-6 py-4">Joined At</th>
                                <th scope="col" className="px-6 py-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center">
                                        <RefreshCw className="w-6 h-6 animate-spin text-[#6b7280] mx-auto" />
                                    </td>
                                </tr>
                            ) : hostels.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-[#6b7280]">
                                        No hostels registered yet.
                                    </td>
                                </tr>
                            ) : hostels.map(h => (
                                <tr key={h.hostelId} className="border-b border-neutral-800 hover:bg-[#0b1220]/30 transition-colors">
                                    <td className="px-6 py-4 font-medium text-white whitespace-nowrap">
                                        {h.hostelName || "Unknown"}
                                        <div className="text-xs text-[#6b7280] font-normal">{h.hostelId}</div>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-xs text-indigo-400">{h.slug}</td>
                                    <td className="px-6 py-4">
                                        <span className={`border text-xs px-2.5 py-1 rounded-full font-medium ${h.status !== "ACTIVE" ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"}`}>
                                            {h.status !== "ACTIVE" ? "SUSPENDED" : "ACTIVE"}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-xs">
                                        <div className="text-[#9ca3af]"><b>Email:</b> {h.adminEmail}</div>
                                        {h.adminPhone && (
                                            <div className="text-[#9ca3af] mt-0.5"><b>Phone:</b> {h.adminPhone}</div>
                                        )}
                                        <div className="text-[#6b7280] mt-1 flex items-center gap-1.5 font-medium italic">
                                            <ShieldCheck className="w-3.5 h-3.5 text-[#6b7280]" />
                                            Secure (Not Viewable)
                                        </div>
                                        <div className="mt-3 flex flex-col sm:flex-row flex-wrap gap-2">
                                            <button
                                                onClick={() => { setResetTarget(h); setNewPassword(""); setShowPass(false); }}
                                                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-[#020617] text-slate-300 hover:bg-slate-700 hover:text-[#f9fafb] border border-[#1f2937] transition-all shadow-sm w-max"
                                            >
                                                <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                                                Reset Password
                                            </button>
                                            <button 
                                                onClick={() => toggleStatus(h)} 
                                                className={`text-xs font-semibold px-2.5 py-1.5 rounded border shadow-sm transition flex items-center gap-1.5 w-max ${h.status !== "ACTIVE" ? 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border-emerald-500/30' : 'bg-amber-600/20 hover:bg-amber-600/30 text-amber-500 border-amber-500/30'}`}
                                            >
                                                {h.status !== "ACTIVE" ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                                                {h.status !== "ACTIVE" ? "Resume Hostel" : "Pause Subscription"}
                                            </button>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {h.createdAt ? new Date(h.createdAt).toLocaleDateString() : "Just Now"}
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => handleDelete(h)}
                                            className="inline-flex max-w-max items-center gap-1.5 py-1.5 px-3 border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/100/20 rounded-md text-xs font-semibold transition"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" /> Delete Hostel
                                        </button>
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
                            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 rounded bg-[#0b1220] hover:bg-neutral-700 text-white disabled:opacity-40">Previous</button>
                            <span className="px-3 py-1">Page {page} of {totalPages}</span>
                            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 rounded bg-[#0b1220] hover:bg-neutral-700 text-white disabled:opacity-40">Next</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Reset Password Modal */}
            {resetTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setResetTarget(null)} />
                    <div className="relative bg-slate-900 border border-[#1f2937] rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-[#1f2937] pb-3">
                            <h2 className="text-lg font-bold text-white tracking-tight">Reset Password</h2>
                            <button onClick={() => setResetTarget(null)} className="text-[#6b7280] hover:text-[#f9fafb] transition-colors"><X className="h-5 w-5" /></button>
                        </div>
                        <p className="text-sm text-[#6b7280]">Setting new password for <span className="font-semibold text-white">{resetTarget.hostelName}</span> ({resetTarget.adminEmail}).</p>
                        <form onSubmit={handleResetPassword} className="space-y-4 pt-2">
                            <div>
                                <label className={LABEL}>New Password</label>
                                <div className="relative">
                                    <input
                                        required
                                        type={showPass ? "text" : "password"}
                                        minLength={8}
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        placeholder="Min 8 characters"
                                        className={MODAL_INPUT}
                                    />
                                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b7280] hover:text-[#f9fafb]">
                                        <span className="text-xs font-semibold">{showPass ? "HIDE" : "SHOW"}</span>
                                    </button>
                                </div>
                            </div>
                            <button type="submit" disabled={submitting}
                                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 border-0 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-orange-500/20 disabled:opacity-50">
                                {submitting ? "Resetting…" : "Confirm Reset"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
