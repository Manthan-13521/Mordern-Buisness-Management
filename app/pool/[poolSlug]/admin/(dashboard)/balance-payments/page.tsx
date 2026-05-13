"use client";

import { useState, useEffect, useCallback } from "react";
import { IndianRupee, RefreshCw, ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { usePoolType } from "@/components/pool/PoolTypeContext";
import { PoolTypeFilter } from "@/components/pool/PoolTypeFilter";

interface Member {
    _id: string;
    memberId: string;
    name: string;
    phone: string;
    paidAmount: number;
    balanceAmount: number;
    paymentStatus: string;
    planId: { _id: string; name: string; price: number };
}

const INPUT = "w-full rounded-xl border border-[#1f2937] bg-[#0b1220] px-3 py-2 text-sm text-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]";
const LABEL = "block text-xs font-medium text-[#9ca3af] mb-1";

export default function BalancePaymentsPage() {
    const [members, setMembers] = useState<Member[]>([]);
    const [total, setTotal] = useState(0);
    const [totalBalance, setTotalBalance] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const { selectedType } = usePoolType();
    
    const [payMember, setPayMember] = useState<Member | null>(null);
    const [payForm, setPayForm] = useState({ amount: "", paymentMethod: "cash", transactionId: "", notes: "" });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const LIMIT = 11;

    const fetch_ = useCallback(async (signal?: AbortSignal) => {
        setLoading(true);
        try {
            const r = await fetch(`/api/members/balance?page=${page}&limit=${LIMIT}&type=${selectedType}&t=${Date.now()}`, { 
                cache: "no-store",
                signal 
            });
            if (!r.ok) throw new Error("Fetch failed");
            const data = await r.json();
            setMembers(data.data ?? []); 
            setTotal(data.total ?? 0); 
            setTotalBalance(data.totalBalance ?? 0);
        } catch (err: any) {
            if (err?.name === "AbortError") return; // ← don't clear data on cancel
            console.error("Balance fetch error:", err);
            setMembers([]);
        } finally {
            setLoading(false);
        }
    }, [page, selectedType]);

    useEffect(() => {
        const controller = new AbortController();
        fetch_(controller.signal);
        return () => controller.abort();
    }, [fetch_]);

    const handlePay = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!payMember) return;
        
        if (payForm.paymentMethod === "upi" && !payForm.transactionId.trim()) {
            setError("UPI Transaction ID is required");
            return;
        }

        setSubmitting(true);
        setError("");

        const res = await fetch("/api/payments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                memberId: payMember._id,
                planId: payMember.planId?._id ?? "",
                amount: Number(payForm.amount),
                paymentMethod: payForm.paymentMethod,
                transactionId: payForm.transactionId || undefined,
                notes: payForm.notes || `Balance payment for ${payMember.memberId}`,
                idempotencyKey: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `balance_${payMember._id}_${Date.now()}`,
            }),
        });
        
        const data = await res.json();
        setSubmitting(false);

        if (!res.ok) {
            setError(typeof data.error === "string" ? data.error : (data.error?.message || JSON.stringify(data.error) || "Failed to record payment"));
            return;
        }

        setPayMember(null);
        fetch_();
    };

    const totalPages = Math.max(1, Math.ceil(total / LIMIT));

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[#f9fafb] flex items-center gap-2">
                        <IndianRupee className="h-6 w-6 text-pink-500" /> Balance & Payments
                    </h1>
                    <p className="text-sm text-[#6b7280]">{total} members with pending balance</p>
                </div>
                <div className="flex-shrink-0">
                    <PoolTypeFilter />
                </div>
            </div>

            {/* TOP SUMMARY CARD */}
            <div className="bg-gradient-to-r from-red-600 to-orange-500 rounded-3xl p-6 shadow-2xl border border-red-500/20 backdrop-blur-md relative overflow-hidden flex items-center justify-between">
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

            <div className="rounded-2xl bg-[#0b1220] border border-[#1f2937] shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-slate-50/50 text-xs text-[#6b7280] uppercase tracking-wider">
                            <tr>
                                {["ID", "Name", "Phone", "Plan", "Paid", "Balance", "Status", "Action"].map(h => (
                                    <th key={h} className="text-left px-4 py-3">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i}>
                                    {Array.from({ length: 8 }).map((_, j) => (
                                        <td key={j} className="px-4 py-3">
                                            <div className="h-4 bg-slate-200 rounded animate-pulse" />
                                        </td>
                                    ))}
                                </tr>
                            )) : members.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                                        No pending balances 🎉
                                    </td>
                                </tr>
                            ) : members.map(m => (
                                <tr key={m._id} className="hover:bg-[#8b5cf6]/5/30">
                                    <td className="px-4 py-3 font-mono text-xs text-[#6b7280]">{m.memberId}</td>
                                    <td className="px-4 py-3 font-medium text-[#f9fafb]">{m.name}</td>
                                    <td className="px-4 py-3 text-[#6b7280]">{m.phone}</td>
                                    <td className="px-4 py-3">{m.planId?.name || "—"}</td>
                                    <td className="px-4 py-3 text-emerald-600">₹{(m.paidAmount ?? 0).toLocaleString("en-IN")}</td>
                                    <td className="px-4 py-3 font-semibold text-red-500">₹{(m.balanceAmount ?? 0).toLocaleString("en-IN")}</td>
                                    <td className="px-4 py-3 text-xs">
                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-semibold ${
                                            m.paymentStatus === "partial" 
                                            ? "bg-amber-500/10 text-amber-400" 
                                            : "bg-red-500/10 text-red-400"
                                        }`}>
                                            {m.paymentStatus}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <button
                                            onClick={() => {
                                                setPayMember(m);
                                                setPayForm({ amount: "", paymentMethod: "cash", transactionId: "", notes: "" });
                                                setError("");
                                            }}
                                            className="flex items-center gap-1.5 text-xs bg-[#8b5cf6] hover:bg-[#7c3aed] border-0  text-white px-3 py-1.5 rounded-lg transition"
                                        >
                                            <Plus className="h-3 w-3" />Pay
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-sm text-[#6b7280]">
                    <span>Page {page} of {totalPages || 1}</span>
                    <div className="flex gap-2">
                        <button 
                            disabled={page <= 1} 
                            onClick={() => setPage(p => p - 1)} 
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#1f2937] bg-[#0b1220] text-[#f9fafb] hover:bg-[#8b5cf6]/5 disabled:bg-[#0b1220] disabled:text-[#6b7280] transition-colors font-medium shadow-sm"
                        >
                            <ChevronLeft className="h-4 w-4"/> Previous
                        </button>
                        <button 
                            disabled={page >= totalPages} 
                            onClick={() => setPage(p => p + 1)} 
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#8b5cf6] hover:bg-[#7c3aed] border-0 text-white disabled:bg-[#0b1220] disabled:text-[#6b7280] transition-colors shadow-sm font-medium"
                        >
                            Next <ChevronRight className="h-4 w-4"/>
                        </button>
                    </div>
                </div>
            </div>

            {/* Payment Modal */}
            {payMember && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setPayMember(null)} />
                    <div className="relative bg-[#0b1220] rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-[#f9fafb]">Record Payment — {payMember.name}</h2>
                            <button onClick={() => setPayMember(null)}><X className="h-5 w-5 text-slate-400" /></button>
                        </div>
                        <p className="text-sm text-[#6b7280]">
                            Pending: <span className="font-bold text-red-500">₹{payMember.balanceAmount.toLocaleString("en-IN")}</span>
                        </p>
                        
                        {error && <p className="text-sm text-red-500">{error}</p>}
                        
                        <form onSubmit={handlePay} className="space-y-4">
                            <div>
                                <label className={LABEL}>Amount (₹)</label>
                                <input
                                    type="number" min="1" max={Math.min(payMember.balanceAmount, 999999)} required
                                    value={payForm.amount}
                                    onChange={e => {
                                        const val = Math.min(payMember.balanceAmount, 999999, Math.max(0, Number(e.target.value)));
                                        if (Number.isFinite(val)) setPayForm(p => ({ ...p, amount: String(val) }));
                                    }}
                                    className={INPUT}
                                />
                            </div>
                            <div>
                                <label className={LABEL}>Payment Method</label>
                                <select
                                    value={payForm.paymentMethod}
                                    onChange={e => setPayForm(p => ({ ...p, paymentMethod: e.target.value }))}
                                    className={INPUT}
                                >
                                    <option value="cash">Cash</option>
                                    <option value="upi">UPI</option>
                                </select>
                            </div>
                            {payForm.paymentMethod === "upi" && (
                                <div>
                                    <label className={LABEL}>UPI Transaction ID</label>
                                    <input
                                        type="text" required
                                        value={payForm.transactionId}
                                        onChange={e => setPayForm(p => ({ ...p, transactionId: e.target.value }))}
                                        className={INPUT}
                                        placeholder="e.g. 320020019932..."
                                    />
                                </div>
                            )}
                            <div>
                                <label className={LABEL}>Notes (optional)</label>
                                <input
                                    type="text"
                                    value={payForm.notes}
                                    onChange={e => setPayForm(p => ({ ...p, notes: e.target.value }))}
                                    className={INPUT}
                                />
                            </div>
                            <button type="submit" disabled={submitting} className="w-full bg-[#8b5cf6] hover:bg-[#7c3aed] border-0  text-white font-semibold py-2.5 rounded-xl transition disabled:opacity-50">
                                {submitting ? "Saving…" : "Record Payment"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
