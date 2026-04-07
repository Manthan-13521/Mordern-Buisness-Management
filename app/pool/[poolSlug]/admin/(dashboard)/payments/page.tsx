"use client";

import { useState, useEffect, useCallback } from "react";
import { Download, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { useSession } from "next-auth/react";
import { usePoolType } from "@/components/pool/PoolTypeContext";
import { PoolTypeFilter } from "@/components/pool/PoolTypeFilter";
import { addPaymentLocal, syncUnsyncedPayments } from "@/lib/local-db/payments.repo";


interface Payment {
    _id: string;
    memberId: { name: string; memberId: string };
    planId: { name: string };
    amount: number;
    paymentMethod: string;
    transactionId?: string;
    date: string;
    status: string;
    recordedBy: { name: string };
}

export default function PaymentsPage() {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const { data: session } = useSession();
    const { selectedType } = usePoolType();

    const LIMIT = 10;
    const [formData, setFormData] = useState({
        memberId: "",
        planId: "",
        amount: 0,
        paymentMethod: "cash",
        transactionId: "",
    });

    const [members, setMembers] = useState<{ _id: string; name: string; memberId: string }[]>([]);
    const [plans, setPlans] = useState<{ _id: string; name: string; price: number }[]>([]);

    const fetchPayments = useCallback(() => {
        setLoading(true);
        setPayments([]); // Phase 2: Reset state before fetching
        fetch(`/api/payments?page=${page}&limit=${LIMIT}&type=${selectedType}&t=${Date.now()}`, { cache: "no-store" })
            .then((res) => res.json())
            .then((data) => {
                const list = Array.isArray(data) ? data : (data.data ?? []);
                setPayments(list);
                setTotal(data.total ?? 0);
                setLoading(false);
            });
    }, [page]);

    useEffect(() => {
        fetchPayments();

        // Fetch members and plans for the new payment form
        fetch(`/api/members?limit=500&t=${Date.now()}`, { cache: "no-store" }).then(r => r.json()).then(data => {
            const list = Array.isArray(data) ? data : (data.data ?? []);
            setMembers(list);
        });
        fetch(`/api/plans?limit=100&t=${Date.now()}`, { cache: "no-store" }).then(r => r.json()).then(data => {
            const list = Array.isArray(data) ? data : (data.data ?? []);
            setPlans(list);
        });

        // Background Offline Sync Execution
        if (session?.user?.poolId) {
            syncUnsyncedPayments();
            const handleSyncOnline = () => {
                syncUnsyncedPayments().finally(fetchPayments);
            };
            window.addEventListener("online", handleSyncOnline);
            return () => window.removeEventListener("online", handleSyncOnline);
        }
    }, [fetchPayments, session?.user?.poolId]);

    const totalPages = Math.max(1, Math.ceil(total / LIMIT));

    const handleExport = () => {
        window.location.href = "/api/payments/export";
    };

    const handlePlanChange = (planId: string) => {
        const selectedPlan = plans.find((p) => p._id === planId);
        setFormData({ ...formData, planId, amount: selectedPlan ? selectedPlan.price : 0 });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.paymentMethod === "upi" && !formData.transactionId) {
            alert("UPI requires a Transaction ID");
            return;
        }

        const tempId = `temp_${Date.now()}`;
        const clientId = `txn_${Date.now()}`;
        try {
            // --- OFFLINE-FIRST: LOCAL DB SAVE ---
            if (session?.user?.poolId) {
                try {
                    await addPaymentLocal({
                        id: tempId,
                        clientId: clientId,
                        poolId: session.user.poolId,
                        memberId: formData.memberId,
                        planId: formData.planId,
                        amount: formData.amount,
                        method: formData.paymentMethod,
                        transactionId: formData.transactionId,
                        status: "pending",
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                        synced: false,
                        syncing: true // 🚀 CRITICAL ISSUE 3: Double execution protection
                    });

                    // Instantly reflect in UI ⚡
                    setPayments(prev => [{
                        _id: tempId,
                        clientId: clientId,
                        synced: false,
                        memberId: members.find(m => m._id === formData.memberId) || { name: "Pending", memberId: formData.memberId },
                        planId: plans.find(p => p._id === formData.planId) || { name: "Pending" },
                        amount: formData.amount,
                        paymentMethod: formData.paymentMethod,
                        transactionId: formData.transactionId,
                        date: new Date().toISOString(),
                        status: "pending",
                        recordedBy: { name: session.user?.name || "Offline" }
                    } as any, ...prev]);
                } catch (e) {
                    console.error("Local payment write failed", e);
                }
            }
            // ------------------------------------

            const res = await fetch("/api/payments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...formData, clientId }),
            });

            if (res.ok) {
                // UI fetches full API response and temp is orphaned/gc'ed or updated
                setIsModalOpen(false);
                setFormData({ memberId: "", planId: "", amount: 0, paymentMethod: "cash", transactionId: "" });
                syncUnsyncedPayments().finally(() => fetchPayments());
            } else {
                // Release lock to allow background retry engine to pick it up later
                if (session?.user?.poolId) {
                    import("@/lib/local-db/db").then(r => r.db.payments.update(tempId, { syncing: false }));
                }
                alert("Server failed or offline. Payment remains queued locally safely.");
                setIsModalOpen(false);
                setFormData({ memberId: "", planId: "", amount: 0, paymentMethod: "cash", transactionId: "" });
            }
        } catch (error) {
            import("@/lib/local-db/db").then(r => r.db.payments.update(tempId, { syncing: false }).catch(()=>{}));
            console.error(error);
            setIsModalOpen(false);
            setFormData({ memberId: "", planId: "", amount: 0, paymentMethod: "cash", transactionId: "" });
        }
    };

    return (
        <div className="space-y-6">
            <div className="sm:flex sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Payments</h1>
                    <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                        A list of all payments received from members.
                    </p>
                </div>
                <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none flex flex-wrap items-center gap-3">
                    <PoolTypeFilter />
                    <button
                        onClick={handleExport}
                        className="inline-flex items-center rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm font-semibold text-gray-300 shadow-sm hover:bg-white/10 transition-colors"
                    >
                        <Download className="-ml-0.5 mr-1.5 h-5 w-5 text-gray-400" />
                        Export Excel
                    </button>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="inline-flex items-center rounded-md bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 border-0 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-50 dark:hover:bg-blue-500/100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                    >
                        <Plus className="-ml-0.5 mr-1.5 h-5 w-5" />
                        Record Payment
                    </button>
                </div>
            </div>

            <div className="mt-8 flow-root">
                <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                        <div className="overflow-hidden shadow-lg border border-white/5 rounded-lg">
                            <table className="min-w-full divide-y divide-white/5">
                                <thead className="bg-slate-900/50 backdrop-blur-md">
                                    <tr>
                                        <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-white sm:pl-6">Date</th>
                                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Member</th>
                                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Plan</th>
                                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Amount</th>
                                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Method</th>
                                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 bg-background">
                                    {loading ? (
                                        <tr><td colSpan={6} className="py-10 text-center text-gray-500">Loading...</td></tr>
                                    ) : payments.length === 0 ? (
                                        <tr><td colSpan={6} className="py-10 text-center text-gray-500">No payments found.</td></tr>
                                    ) : (
                                        payments.map((payment) => (
                                            <tr key={payment._id}>
                                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-900 dark:text-gray-300 sm:pl-6">
                                                    {new Date(payment.date).toLocaleString()}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-gray-900 dark:text-white">
                                                    <div className="flex flex-col">
                                                        <span>{payment.memberId?.name || "N/A"}</span>
                                                        <span className="text-xs text-gray-500">{payment.memberId?.memberId}</span>
                                                    </div>
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                                                    {payment.planId?.name || "N/A"}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-gray-900 dark:text-white">
                                                    ₹{payment.amount}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${payment.paymentMethod === "upi" ? "bg-purple-50 text-purple-700 ring-purple-600/20" : "bg-green-50 text-green-700 ring-green-600/20"
                                                        }`}>
                                                        {payment.paymentMethod.toUpperCase()}
                                                    </span>
                                                    {payment.transactionId && (
                                                        <div className="text-xs text-gray-400 mt-1">Tx: {payment.transactionId}</div>
                                                    )}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                    {(payment as any).synced === false ? (
                                                        <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400">
                                                            🟡 Pending
                                                        </span>
                                                    ) : payment.status === "failed" ? (
                                                        <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-400">
                                                            🔴 Failed
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400">
                                                            🟢 Synced
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Pagination */}
            {total > LIMIT && (
                <div className="flex items-center justify-between pt-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Page {page} of {totalPages}
                    </p>
                    <div className="flex gap-2">
                        <button 
                            disabled={page === 1 || loading} 
                            onClick={() => setPage(p => Math.max(1, p - 1))} 
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:bg-slate-50 disabled:text-slate-400 dark:disabled:bg-slate-900/50 dark:disabled:text-slate-600 transition-colors font-medium shadow-sm"
                        >
                            <ChevronLeft className="h-4 w-4" /> Previous
                        </button>
                        <button 
                            disabled={page >= totalPages || loading} 
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 border-0 text-white hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 dark:disabled:bg-slate-800 dark:disabled:text-slate-600 transition-colors shadow-sm font-medium"
                        >
                            Next <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
                    <div className="relative w-full max-w-md rounded-xl bg-slate-900 border border-white/10 p-6 shadow-2xl">
                        <h2 className="text-xl font-semibold dark:text-white mb-4">Record Payment</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium dark:text-gray-300">Member</label>
                                <select required value={formData.memberId} onChange={e => setFormData({ ...formData, memberId: e.target.value })} className="mt-1 block w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition">
                                    <option value="" className="bg-slate-900">Select Member</option>
                                    {members.map(m => <option key={m._id} value={m._id} className="bg-slate-900">{m.name} ({m.memberId})</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium dark:text-gray-300">Plan</label>
                                <select required value={formData.planId} onChange={e => handlePlanChange(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 bg-background shadow-sm dark:text-white dark:border-gray-700">
                                    <option value="">Select Plan</option>
                                    {plans.map(p => <option key={p._id} value={p._id}>{p.name} - ₹{p.price}</option>)}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium dark:text-gray-300">Amount (₹)</label>
                                    <input
                                        required type="number" min="1" max="9999999999" step="1"
                                        value={formData.amount}
                                        onChange={e => {
                                            const val = Math.min(9_999_999_999, Math.max(0, Number(e.target.value)));
                                            if (Number.isFinite(val)) setFormData({ ...formData, amount: val });
                                        }}
                                        placeholder="Max ₹9,999,999,999"
                                        className="mt-1 block w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium dark:text-gray-300">Method</label>
                                    <select required value={formData.paymentMethod} onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })} className="mt-1 block w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition">
                                        <option value="cash" className="bg-slate-900">Cash</option>
                                        <option value="upi" className="bg-slate-900">UPI</option>
                                    </select>
                                </div>
                            </div>

                            {formData.paymentMethod === "upi" && (
                                <div>
                                    <label className="block text-sm font-medium dark:text-gray-300">Transaction ID</label>
                                    <input required type="text" value={formData.transactionId} onChange={e => setFormData({ ...formData, transactionId: e.target.value })} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 bg-background shadow-sm dark:text-white dark:border-gray-700" placeholder="e.g. UPI Ref No" />
                                </div>
                            )}

                            <div className="flex justify-end space-x-3 mt-6">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm rounded-md border dark:border-gray-700 dark:text-gray-300">Cancel</button>
                                <button type="submit" className="px-4 py-2 text-sm rounded-md bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 border-0 text-white hover:bg-blue-50 dark:hover:bg-blue-500/100">Record</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
