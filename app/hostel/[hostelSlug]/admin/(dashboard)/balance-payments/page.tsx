"use client";

import { useEffect, useState, useCallback } from "react";
import { IndianRupee, RefreshCw, ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { useHostelBlock } from "@/components/hostel/HostelBlockContext";
import { HostelBlockFilter } from "@/components/hostel/HostelBlockFilter";

type BalanceMember = { _id: string; memberId: string; name: string; phone: string; blockNo: string; floorNo: string; roomNo: string; planId: any; totalFee: number; totalPaid: number; balance: number; };
const INPUT = "w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500";
const LABEL = "block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1";

export default function BalancePaymentsPage() {
    const { selectedBlock } = useHostelBlock();
    const [members, setMembers] = useState<BalanceMember[]>([]);
    const [total, setTotal] = useState(0);
    const [totalBalance, setTotalBalance] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [payMember, setPayMember] = useState<BalanceMember | null>(null);
    const [payForm, setPayForm] = useState({ amount: "", paymentMethod: "cash", transactionId: "", notes: "" });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const limit = 11;

    const fetch_ = useCallback(async (signal?: AbortSignal, retryCount = 0) => {
        setLoading(true);
        try {
            const blockParam = selectedBlock && selectedBlock !== "all" 
                ? `&block=${encodeURIComponent(selectedBlock)}` 
                : "";
            const r = await fetch(
                `/api/hostel/members/balance?page=${page}&limit=${limit}${blockParam}&t=${Date.now()}`,
                { cache: "no-store", signal }
            );
            if (!r.ok) {
                if (retryCount < 1 && (r.status === 401 || r.status >= 500)) {
                    await new Promise(res => setTimeout(res, 800));
                    return fetch_(signal, retryCount + 1);
                }
                throw new Error(`Fetch failed: ${r.status}`);
            }
            const d = await r.json();
            setMembers(d.data || []); 
            setTotal(d.total || 0); 
            setTotalBalance(d.totalBalance || 0);
        } catch (err: any) {
            if (err?.name === "AbortError") return; // ← don't clear data on cancel
            console.error("Hostel balance fetch error:", err);
            // ── Preserve last valid state on transient errors ──
        } finally {
            setLoading(false);
        }
    }, [page, selectedBlock]);

    useEffect(() => {
        const controller = new AbortController();
        fetch_(controller.signal);
        return () => controller.abort();
    }, [fetch_]);

    useEffect(() => {
        setPage(1);
    }, [selectedBlock]);

    const handlePay = async (e: React.FormEvent) => {
        e.preventDefault(); if (!payMember) return; setSubmitting(true); setError("");
        const res = await fetch("/api/hostel/payments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ memberId: payMember._id, amount: Math.min(Number(payForm.amount), 9999999999), paymentMethod: payForm.paymentMethod, transactionId: payForm.transactionId, notes: payForm.notes, idempotencyKey: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString() }) });
        const data = await res.json();
        if (!res.ok) { setError(data.error || "Payment failed"); setSubmitting(false); return; }
        setPayMember(null); fetch_(); setSubmitting(false);
    };

    const totalPages = Math.ceil(total / limit);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><IndianRupee className="h-6 w-6 text-pink-500"/>Balance & Payments</h1>
                    <p className="text-sm text-slate-500">
                        {total} members with pending balance
                        {selectedBlock !== "all" && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                Block {selectedBlock}
                            </span>
                        )}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <HostelBlockFilter />
                </div>
            </div>

            {/* TOP SUMMARY CARD */}
            <div className="bg-gradient-to-r from-red-600 to-orange-500 dark:from-red-900/80 dark:to-orange-900/80 rounded-3xl p-6 shadow-2xl border border-red-500/20 backdrop-blur-md relative overflow-hidden flex items-center justify-between">
                <div className="relative z-10">
                    <h2 className="text-sm font-bold text-white/90 uppercase tracking-widest mb-1">Total Outstanding Balance</h2>
                    <p className="text-4xl font-extrabold text-white flex items-center gap-1 drop-shadow-md">
                        <IndianRupee className="h-8 w-8" />
                        {totalBalance.toLocaleString("en-IN")}
                    </p>
                </div>
                <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none">
                    <IndianRupee className="h-32 w-32 -mr-6 mt-[-10px]" />
                </div>
            </div>

            <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-700/50 text-xs text-slate-500 uppercase tracking-wider">
                            <tr>{["ID","Name","Room","Plan","Total Fee","Paid","Balance","Action"].map(h=><th key={h} className="text-left px-4 py-3">{h}</th>)}</tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {loading ? Array.from({length:5}).map((_,i)=><tr key={i}>{Array.from({length:8}).map((_,j)=><td key={j} className="px-4 py-3"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"/></td>)}</tr>)
                            : members.length===0 ? <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">No pending balances {selectedBlock !== "all" && `in Block ${selectedBlock}`} 🎉</td></tr>
                            : members.map(m=>(
                                <tr key={m._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{m.memberId}</td>
                                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{m.name}</td>
                                    <td className="px-4 py-3 text-slate-500">{m.blockNo}-{m.floorNo}-{m.roomNo}</td>
                                    <td className="px-4 py-3">{m.planId?.name || "—"}</td>
                                    <td className="px-4 py-3">₹{m.totalFee?.toLocaleString("en-IN")}</td>
                                    <td className="px-4 py-3 text-emerald-600">₹{m.totalPaid?.toLocaleString("en-IN")}</td>
                                    <td className="px-4 py-3 font-semibold text-red-500">₹{m.balance?.toLocaleString("en-IN")}</td>
                                    <td className="px-4 py-3">
                                        <button onClick={()=>{setPayMember(m);setPayForm({amount:"",paymentMethod:"cash",transactionId:"",notes:""});setError("");}} className="flex items-center gap-1.5 text-xs bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 border-0 hover:bg-blue-50 dark:hover:bg-blue-500/100 text-white px-3 py-1.5 rounded-lg transition">
                                            <Plus className="h-3 w-3"/>Pay
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-700 text-sm text-slate-500">
                    <span>Page {page} of {totalPages||1}</span>
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

            {payMember && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={()=>setPayMember(null)}/>
                    <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
                        <div className="flex items-center justify-between"><h2 className="text-lg font-semibold text-slate-800 dark:text-white">Record Payment — {payMember.name}</h2><button onClick={()=>setPayMember(null)}><X className="h-5 w-5 text-slate-400"/></button></div>
                        <p className="text-sm text-slate-500">Pending: <span className="font-bold text-red-500">₹{payMember.balance.toLocaleString("en-IN")}</span></p>
                        {error && <p className="text-sm text-red-500">{error}</p>}
                        <form onSubmit={handlePay} className="space-y-4">
                            <div><label className={LABEL}>Amount (₹)</label><input type="number" min="1" max={Math.min(payMember.balance, 9999999999)} required value={payForm.amount} onChange={e=>setPayForm(p=>({...p,amount:e.target.value}))} className={INPUT}/></div>
                            <div><label className={LABEL}>Payment Method</label>
                                <select value={payForm.paymentMethod} onChange={e=>setPayForm(p=>({...p,paymentMethod:e.target.value}))} className={INPUT}>
                                    <option value="cash">Cash</option><option value="upi">UPI</option><option value="card">Card</option>
                                </select></div>
                            <div><label className={LABEL}>Transaction ID (optional)</label><input type="text" value={payForm.transactionId} onChange={e=>setPayForm(p=>({...p,transactionId:e.target.value}))} className={INPUT}/></div>
                            <div><label className={LABEL}>Notes</label><input type="text" value={payForm.notes} onChange={e=>setPayForm(p=>({...p,notes:e.target.value}))} className={INPUT}/></div>
                            <button type="submit" disabled={submitting} className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 border-0 hover:bg-blue-50 dark:hover:bg-blue-500/100 text-white font-semibold py-2.5 rounded-xl transition disabled:opacity-50">{submitting?"Saving…":"Record Payment"}</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
