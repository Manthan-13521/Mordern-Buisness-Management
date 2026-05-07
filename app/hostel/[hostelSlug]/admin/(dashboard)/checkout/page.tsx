"use client";

import { useEffect, useState, useCallback } from "react";
import { UserX, Search, RefreshCw, ChevronLeft, ChevronRight, RotateCcw, X } from "lucide-react";

type Member = { _id: string; memberId: string; name: string; phone: string; blockNo: string; floorNo: string; roomNo: string; planId: any; planEndDate: string; totalFee: number; balance: number; };
type Plan = { _id: string; name: string; durationDays: number; price: number };
const INPUT = "w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500";
const LABEL = "block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1";

export default function CheckoutPage() {
    const [members, setMembers] = useState<Member[]>([]);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [renewMember, setRenewMember] = useState<Member | null>(null);
    const [renewForm, setRenewForm] = useState({ planId: "", paidAmount: "", paymentMode: "cash", notes: "" });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const limit = 11;

    const fetch_ = useCallback(async () => {
        setLoading(true);
        const r = await fetch(`/api/hostel/members?status=checkout&page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`);
        const d = await r.json();
        setMembers(d.data || []); setTotal(d.total || 0); setLoading(false);
    }, [page, search]);

    useEffect(() => { fetch_(); }, [fetch_]);
    useEffect(() => { fetch("/api/hostel/plans", { cache: 'no-store' }).then(r => r.json()).then(d => setPlans(d.data || [])); }, []);

    const handleRenew = async (e: React.FormEvent) => {
        e.preventDefault(); if (!renewMember) return; setSubmitting(true); setError("");
        const res = await fetch(`/api/hostel/members/${renewMember._id}/renew`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...renewForm, paidAmount: Math.min(Number(renewForm.paidAmount), 9999999999), idempotencyKey: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString() }) });
        const data = await res.json();
        if (!res.ok) { setError(typeof data.error === "string" ? data.error : (data.error?.message || JSON.stringify(data.error) || "Renewal failed")); setSubmitting(false); return; }
        setRenewMember(null); fetch_(); setSubmitting(false);
    };

    const totalPages = Math.ceil(total / limit);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div><h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><UserX className="h-6 w-6 text-slate-500" />Checkout Audit</h1>
                <p className="text-sm text-slate-500">{total} checked out occupants</p></div>
                <div className="flex items-center gap-2">
                    <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input className="pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm w-52 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Search…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} /></div>
                    <button onClick={fetch_} className="p-2 rounded-xl border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"><RefreshCw className="h-4 w-4 text-slate-500" /></button>
                </div>
            </div>

            <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-700/50 text-xs text-slate-500 uppercase tracking-wider">
                            <tr>{["ID","Name","Phone","Room","Plan","Check-in","Checkout","Final Balance"].map(h => <th key={h} className="text-left px-4 py-3">{h}</th>)}</tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {loading ? Array.from({length:5}).map((_,i)=><tr key={i}>{Array.from({length:8}).map((_,j)=><td key={j} className="px-4 py-3"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"/></td>)}</tr>)
                            : members.length === 0 ? <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">No checkout history available</td></tr>
                            : members.map(m => (
                                <tr key={m._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{m.memberId}</td>
                                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{m.name}</td>
                                    <td className="px-4 py-3 text-slate-500">{m.phone}</td>
                                    <td className="px-4 py-3">{m.blockNo}-{m.floorNo}-{m.roomNo}</td>
                                    <td className="px-4 py-3">{m.planId?.name || "—"}</td>
                                    <td className="px-4 py-3 text-slate-500">{(m as any).checkInDate ? new Date((m as any).checkInDate).toLocaleDateString("en-IN") : new Date((m as any).createdAt).toLocaleDateString("en-IN")}</td>
                                    <td className="px-4 py-3 text-slate-700 font-semibold">{(m as any).checkoutDate ? new Date((m as any).checkoutDate).toLocaleDateString("en-IN") : "—"}</td>
                                    <td className="px-4 py-3 font-mono font-bold">
                                        {m.balance > 0 ? (
                                            <span className="text-emerald-500">Advance: ₹{m.balance.toLocaleString()}</span>
                                        ) : m.balance < 0 ? (
                                            <span className="text-red-500">Due: ₹{Math.abs(m.balance).toLocaleString()}</span>
                                        ) : (
                                            <span className="text-slate-400 font-normal italic">₹0</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-700 text-sm text-slate-500">
                    <span>Page {page} of {totalPages || 1}</span>
                    <div className="flex gap-2">
                        <button 
                            disabled={page <= 1} 
                            onClick={() => setPage(p => p - 1)} 
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:bg-slate-50 disabled:text-slate-400 dark:disabled:bg-slate-900/50 dark:disabled:text-slate-600 transition-colors font-medium shadow-sm"
                        >
                            <ChevronLeft className="h-4 w-4"/> Previous
                        </button>
                        <button 
                            disabled={page >= totalPages} 
                            onClick={() => setPage(p => p + 1)} 
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 border-0 text-white hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 dark:disabled:bg-slate-800 dark:disabled:text-slate-600 transition-colors shadow-sm font-medium"
                        >
                            Next <ChevronRight className="h-4 w-4"/>
                        </button>
                    </div>
                </div>
            </div>

            {renewMember && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setRenewMember(null)} />
                    <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
                        <div className="flex items-center justify-between"><h2 className="text-lg font-semibold text-slate-800 dark:text-white">Renew — {renewMember.name}</h2><button onClick={() => setRenewMember(null)}><X className="h-5 w-5 text-slate-400"/></button></div>
                        {error && <p className="text-sm text-red-500">{error}</p>}
                        <form onSubmit={handleRenew} className="space-y-4">
                            <div><label className={LABEL}>Plan</label>
                                <select value={renewForm.planId} onChange={e=>setRenewForm(p=>({...p,planId:e.target.value}))} required className={INPUT}>
                                    <option value="">Select plan…</option>
                                    {plans.map(p=><option key={p._id} value={p._id}>{p.name} — ₹{p.price} / {p.durationDays}d</option>)}
                                </select></div>
                            <div><label className={LABEL}>Payment Mode</label>
                                <select value={renewForm.paymentMode} onChange={e=>setRenewForm(p=>({...p,paymentMode:e.target.value}))} className={INPUT}>
                                    <option value="cash">Cash</option><option value="upi">UPI</option><option value="card">Card</option>
                                </select></div>
                            <div><label className={LABEL}>Paid Amount (₹)</label><input type="number" min="0" max="9999999999" required value={renewForm.paidAmount} onChange={e=>setRenewForm(p=>({...p,paidAmount:e.target.value}))} className={INPUT}/></div>
                            <div><label className={LABEL}>Notes</label><input type="text" value={renewForm.notes} onChange={e=>setRenewForm(p=>({...p,notes:e.target.value}))} className={INPUT}/></div>
                            <button type="submit" disabled={submitting} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-xl transition disabled:opacity-50">{submitting?"Processing…":"Confirm Renewal"}</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
