"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, RefreshCw, IndianRupee, CreditCard } from "lucide-react";

interface Member {
    _id: string;
    memberId: string;
    name: string;
    phone: string;
    paidAmount: number;
    balanceAmount: number;
    paymentStatus: string;
    planId: { _id: string; name: string; price: number };
    planEndDate?: string;
    expiryDate?: string;
}

interface PaymentModalProps {
    member: Member;
    onClose: () => void;
    onSuccess: () => void;
}

function PaymentModal({ member, onClose, onSuccess }: PaymentModalProps) {
    const [amount, setAmount] = useState<number>(member.balanceAmount);
    const [method, setMethod] = useState<"cash" | "upi">("cash");
    const [txnId, setTxnId] = useState("");
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || amount <= 0) { alert("Enter a valid amount"); return; }
        if (method === "upi" && !txnId.trim()) { alert("UPI Transaction ID required"); return; }

        setSaving(true);
        const res = await fetch("/api/payments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                memberId:   member._id,
                planId:     member.planId?._id ?? "",
                amount:     Number(amount),
                paymentMethod: method,
                transactionId: txnId || undefined,
                notes:      `Balance payment for ${member.memberId}`,
                idempotencyKey: `balance_${member._id}_${Date.now()}`,
            }),
        });
        setSaving(false);

        if (res.ok) { onSuccess(); onClose(); }
        else alert((await res.json()).error || "Failed to record payment");
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 shadow-2xl p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Record Balance Payment</h2>
                <p className="text-sm text-gray-500 mb-5">
                    {member.name} ({member.memberId}) — Outstanding: <span className="font-semibold text-red-600">₹{member.balanceAmount.toLocaleString("en-IN")}</span>
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount (₹)</label>
                        <input
                            type="number" min="1" max={member.balanceAmount} step="1"
                            value={amount}
                            onChange={e => setAmount(Number(e.target.value))}
                            className="block w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Method</label>
                        <select
                            value={method}
                            onChange={e => setMethod(e.target.value as "cash" | "upi")}
                            className="block w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="cash">Cash</option>
                            <option value="upi">UPI</option>
                        </select>
                    </div>
                    {method === "upi" && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">UPI Transaction ID</label>
                            <input
                                type="text" value={txnId} onChange={e => setTxnId(e.target.value)}
                                placeholder="e.g. 320020019932..."
                                className="block w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500"
                                required
                            />
                        </div>
                    )}
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={onClose}
                            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 ring-1 ring-gray-300 dark:ring-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                            Cancel
                        </button>
                        <button type="submit" disabled={saving}
                            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60">
                            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <IndianRupee className="h-4 w-4" />}
                            Record Payment
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function BalancePaymentsPage() {
    const [members, setMembers] = useState<Member[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<Member | null>(null);

    const LIMIT = 7;

    const fetchMembers = useCallback(() => {
        setLoading(true);
        fetch(`/api/members/balance?page=${page}&limit=${LIMIT}`)
            .then(r => r.json())
            .then(data => { setMembers(data.data ?? []); setTotal(data.total ?? 0); setLoading(false); })
            .catch(() => setLoading(false));
    }, [page]);

    useEffect(() => { fetchMembers(); }, [fetchMembers]);

    const totalPages = Math.max(1, Math.ceil(total / LIMIT));
    const grandBalance = members.reduce((s, m) => s + (m.balanceAmount ?? 0), 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="sm:flex sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Balance Payments</h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {total} member{total !== 1 ? "s" : ""} with outstanding balance
                    </p>
                </div>
                {total > 0 && (
                    <div className="mt-4 sm:mt-0 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-4 py-2 text-right">
                        <p className="text-xs text-red-500 uppercase tracking-wide font-medium">Total Outstanding</p>
                        <p className="text-xl font-bold text-red-700 dark:text-red-400">₹{grandBalance.toLocaleString("en-IN")}</p>
                    </div>
                )}
            </div>

            {/* Table */}
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-xl dark:ring-white/10">
                <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-800">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                        <tr>
                            {["Member", "Phone", "Plan", "Paid", "Balance", "Payment Status", ""].map(h => (
                                <th key={h} className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 first:pl-6">
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-800 dark:bg-gray-950">
                        {loading ? (
                            <tr><td colSpan={7} className="py-12 text-center">
                                <RefreshCw className="animate-spin h-5 w-5 mx-auto text-indigo-500" />
                            </td></tr>
                        ) : members.length === 0 ? (
                            <tr><td colSpan={7} className="py-16 text-center text-gray-500">
                                <IndianRupee className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                                <p className="font-medium">No outstanding balances</p>
                                <p className="text-sm text-gray-400 mt-1">All members are fully paid up.</p>
                            </td></tr>
                        ) : members.map(m => (
                            <tr key={m._id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                                <td className="py-4 pl-6 pr-4 text-sm">
                                    <p className="font-medium text-gray-900 dark:text-white">{m.name}</p>
                                    <p className="text-xs text-gray-400">{m.memberId}</p>
                                </td>
                                <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">{m.phone}</td>
                                <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">{m.planId?.name ?? "N/A"}</td>
                                <td className="px-4 py-4 text-sm font-medium text-green-600 dark:text-green-400">
                                    ₹{(m.paidAmount ?? 0).toLocaleString("en-IN")}
                                </td>
                                <td className="px-4 py-4 text-sm font-bold text-red-600 dark:text-red-400">
                                    ₹{(m.balanceAmount ?? 0).toLocaleString("en-IN")}
                                </td>
                                <td className="px-4 py-4 text-sm">
                                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset capitalize ${
                                        m.paymentStatus === "partial"
                                            ? "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-900/30 dark:text-amber-400"
                                            : "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-900/30 dark:text-red-400"
                                    }`}>
                                        {m.paymentStatus}
                                    </span>
                                </td>
                                <td className="px-4 py-4 text-sm text-right">
                                    <button
                                        onClick={() => setSelected(m)}
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors"
                                    >
                                        <CreditCard className="h-3.5 w-3.5" /> Record Payment
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {total > LIMIT && (
                <div className="flex items-center justify-between pt-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Page {page} of {totalPages}
                    </p>
                    <div className="flex gap-2">
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || loading}
                            className="inline-flex items-center rounded-md px-3 py-2 text-sm text-gray-700 bg-white ring-1 ring-gray-300 hover:bg-gray-50 disabled:opacity-40 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700">
                            <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                        </button>
                        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages || loading}
                            className="inline-flex items-center rounded-md px-3 py-2 text-sm text-gray-700 bg-white ring-1 ring-gray-300 hover:bg-gray-50 disabled:opacity-40 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700">
                            Next <ChevronRight className="h-4 w-4 ml-1" />
                        </button>
                    </div>
                </div>
            )}

            {/* Payment Modal */}
            {selected && (
                <PaymentModal member={selected} onClose={() => setSelected(null)} onSuccess={fetchMembers} />
            )}
        </div>
    );
}
