"use client";

import { useEffect, useState, useCallback } from "react";
import { IndianRupee, RefreshCw, ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { useHostelBlock } from "@/components/hostel/HostelBlockContext";
import { HostelBlockFilter } from "@/components/hostel/HostelBlockFilter";

type BalanceMember = { _id: string; memberId: string; name: string; phone: string; blockNo: string; floorNo: string; roomNo: string; planId: any; totalFee: number; totalPaid: number; balance: number; };
const INPUT = "w-full rounded-xl border border-[#1f2937] bg-[#0b1220] px-3 py-2 text-sm text-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]";
const LABEL = "block text-xs font-medium text-[#9ca3af] mb-1";

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
            if (err?.name === "AbortError") return; 
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
        if (!res.ok) { setError(typeof data.error === "string" ? data.error : (data.error?.message || JSON.stringify(data.error) || "Payment failed")); setSubmitting(false); return; }
        setPayMember(null); fetch_(); setSubmitting(false);
    };

    const totalPages = Math.ceil(total / limit);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[#f9fafb] flex items-center gap-2"><IndianRupee className="h-6 w-6 text-[#8b5cf6]"/>Balance & Payments</h1>
                    <p className="text-sm text-[#6b7280]">
                        {total} members with pending balance
                        {selectedBlock !== "all" && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400">
                                Block {selectedBlock}
                            </span>
                        )}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <HostelBlockFilter />
                </div>
            </div>

            {/* TOP SUMMARY CARD — Subdued dark theme */}
            <div className="rounded-2xl bg-[#0b1220] border border-[#1f2937] p-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-[#8b5cf6]/5 to-rose-500/5 pointer-events-none" />
                <div className="relative z-10 flex items-center justify-between">
                    <div>
                        <h2 className="text-xs font-bold text-[#9ca3af] uppercase tracking-widest mb-2">Total Outstanding Balance</h2>
                        <p className="text-3xl font-extrabold text-[#f9fafb] flex items-center gap-1">
                            <IndianRupee className="h-7 w-7 text-rose-400" />
                            {totalBalance.toLocaleString("en-IN")}
                        </p>
                    </div>
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                        <IndianRupee className="h-8 w-8 text-rose-400/60" />
                    </div>
                </div>
            </div>

            <div className="rounded-2xl bg-[#0b1220] border border-[#1f2937] shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-[#020617] text-xs text-[#9ca3af] uppercase tracking-wider border-b border-[#1f2937]">
                            <tr>{["ID","Name","Room","Plan","Total Fee","Paid","Balance","Action"].map(h=><th key={h} className="text-left px-4 py-3 font-bold">{h}</th>)}</tr>
                        </thead>
                        <tbody className="divide-y divide-[#1f2937]">
                            {loading ? Array.from({length:5}).map((_,i)=><tr key={i}>{Array.from({length:8}).map((_,j)=><td key={j} className="px-4 py-3"><div className="h-4 bg-[#1f2937] rounded animate-pulse"/></td>)}</tr>)
                            : members.length===0 ? <tr><td colSpan={8} className="px-4 py-12 text-center text-[#6b7280]">No pending balances {selectedBlock !== "all" && `in Block ${selectedBlock}`} 🎉</td></tr>
                            : members.map(m=>(
                                <tr key={m._id} className="hover:bg-[#8b5cf6]/5 transition-colors">
                                    <td className="px-4 py-3 font-mono text-xs text-[#6b7280]">{m.memberId}</td>
                                    <td className="px-4 py-3 font-medium text-[#f9fafb]">{m.name}</td>
                                    <td className="px-4 py-3 text-[#6b7280]">{m.blockNo}-{m.floorNo}-{m.roomNo}</td>
                                    <td className="px-4 py-3 text-[#9ca3af]">{m.planId?.name || "—"}</td>
                                    <td className="px-4 py-3 text-[#f9fafb]">₹{m.totalFee?.toLocaleString("en-IN")}</td>
                                    <td className="px-4 py-3 text-emerald-400">₹{m.totalPaid?.toLocaleString("en-IN")}</td>
                                    <td className="px-4 py-3 font-semibold text-rose-400">₹{m.balance?.toLocaleString("en-IN")}</td>
                                    <td className="px-4 py-3">
                                        <button onClick={()=>{setPayMember(m);setPayForm({amount:"",paymentMethod:"cash",transactionId:"",notes:""});setError("");}} className="flex items-center gap-1.5 text-xs bg-[#8b5cf6] hover:bg-[#7c3aed] border-0 text-white px-3 py-1.5 rounded-lg transition">
                                            <Plus className="h-3 w-3"/>Pay
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="flex items-center justify-between px-4 py-3 border-t border-[#1f2937] text-sm text-[#6b7280]">
                    <span>Page {page} of {totalPages||1}</span>
                    <div className="flex gap-2">
                        <button 
                            disabled={page <= 1} 
                            onClick={() => setPage(p => p - 1)} 
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#1f2937] bg-[#020617] text-[#9ca3af] hover:text-[#f9fafb] hover:bg-[#111827] disabled:opacity-30 transition-colors font-medium shadow-sm"
                        >
                            <ChevronLeft className="h-4 w-4"/> Previous
                        </button>
                        <button 
                            disabled={page >= totalPages} 
                            onClick={() => setPage(p => p + 1)} 
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#8b5cf6] hover:bg-[#7c3aed] border-0 text-white disabled:opacity-30 transition-colors shadow-sm font-medium"
                        >
                            Next <ChevronRight className="h-4 w-4"/>
                        </button>
                    </div>
                </div>
            </div>

            {payMember && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={()=>setPayMember(null)}/>
                    <div className="relative bg-[#0b1220] border border-[#1f2937] rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
                        <div className="flex items-center justify-between"><h2 className="text-lg font-semibold text-[#f9fafb]">Record Payment — {payMember.name}</h2><button onClick={()=>setPayMember(null)}><X className="h-5 w-5 text-[#6b7280]"/></button></div>
                        <p className="text-sm text-[#6b7280]">Pending: <span className="font-bold text-rose-400">₹{payMember.balance.toLocaleString("en-IN")}</span></p>
                        {error && <p className="text-sm text-rose-400">{error}</p>}
                        <form onSubmit={handlePay} className="space-y-4">
                            <div><label className={LABEL}>Amount (₹)</label><input type="number" min="1" max={Math.min(payMember.balance, 9999999999)} required value={payForm.amount} onChange={e=>setPayForm(p=>({...p,amount:e.target.value}))} className={INPUT}/></div>
                            <div><label className={LABEL}>Payment Method</label>
                                <select value={payForm.paymentMethod} onChange={e=>setPayForm(p=>({...p,paymentMethod:e.target.value}))} className={INPUT}>
                                    <option value="cash">Cash</option><option value="upi">UPI</option><option value="card">Card</option>
                                </select></div>
                            <div><label className={LABEL}>Transaction ID (optional)</label><input type="text" value={payForm.transactionId} onChange={e=>setPayForm(p=>({...p,transactionId:e.target.value}))} className={INPUT}/></div>
                            <div><label className={LABEL}>Notes</label><input type="text" value={payForm.notes} onChange={e=>setPayForm(p=>({...p,notes:e.target.value}))} className={INPUT}/></div>
                            <button type="submit" disabled={submitting} className="w-full bg-[#8b5cf6] hover:bg-[#7c3aed] border-0 text-white font-semibold py-2.5 rounded-xl transition disabled:opacity-50">{submitting?"Saving…":"Record Payment"}</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
