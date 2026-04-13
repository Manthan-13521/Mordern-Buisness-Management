"use client";

import { useEffect, useState, useCallback } from "react";
import { CreditCard, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { useHostelBlock } from "@/components/hostel/HostelBlockContext";
import { HostelBlockFilter } from "@/components/hostel/HostelBlockFilter";

type Payment = { _id: string; memberId: any; planId: any; amount: number; paymentMethod: string; paymentType: string; status: string; createdAt: string; transactionId?: string; };

export default function PaymentsPage() {
    const { selectedBlock } = useHostelBlock();
    const [payments, setPayments] = useState<Payment[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const limit = 11;

    // Removed Actions state
    const fetchPayments = useCallback(async (signal?: AbortSignal, retryCount = 0) => {
        setLoading(true);
        try {
            const blockParam = selectedBlock && selectedBlock !== "all"
                ? `&block=${encodeURIComponent(selectedBlock)}`
                : "";
            const r = await fetch(
                `/api/hostel/payments?page=${page}&limit=${limit}${blockParam}&t=${Date.now()}`,
                { cache: "no-store", signal }
            );
            if (!r.ok) {
                // Retry once on transient auth or server errors
                if (retryCount < 1 && (r.status === 401 || r.status >= 500)) {
                    await new Promise(res => setTimeout(res, 800));
                    return fetchPayments(signal, retryCount + 1);
                }
                throw new Error(`Fetch failed: ${r.status}`);
            }
            const d = await r.json();
            setPayments(d.data || []);
            setTotal(d.total || 0);
        } catch (err: any) {
            if (err?.name === "AbortError") return; // ← ignore cancelled, don't clear data
            console.error("Payment fetch error:", err);
            // ── CRITICAL: Preserve last valid state on transient errors ──
        } finally {
            setLoading(false);
        }
    }, [page, selectedBlock]);

    // Single effect — cancels previous fetch automatically when deps change
    useEffect(() => {
        const controller = new AbortController();
        fetchPayments(controller.signal);
        return () => controller.abort();
    }, [fetchPayments]);

    // Reset page on block change
    useEffect(() => {
        setPage(prev => prev === 1 ? 1 : 1);
    }, [selectedBlock]);

    const totalPages = Math.ceil(total / limit);

    const typeColor: Record<string, string> = {
        initial: "bg-indigo-100 dark:bg-indigo-900/30 text-blue-600 dark:text-blue-400",
        renewal: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600",
        balance: "bg-amber-100 dark:bg-amber-900/30 text-amber-600",
        rent: "bg-red-100 dark:bg-red-900/30 text-red-600",
    };




    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <CreditCard className="h-6 w-6 text-sky-500"/>Payments
                    </h1>
                    <p className="text-sm text-slate-500">
                        {total} payment records
                        {selectedBlock !== "all" && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                Block {selectedBlock}
                            </span>
                        )}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <HostelBlockFilter />
                    <button onClick={() => fetchPayments()} className="p-2 rounded-xl border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 bg-white dark:bg-slate-800 shadow-sm">
                        <RefreshCw className="h-4 w-4 text-slate-500"/>
                    </button>
                </div>
            </div>

            <div className="rounded-2xl bg-slate-900 border border-white/5 shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-slate-950/50 backdrop-blur-md text-xs text-slate-400 uppercase tracking-wider">
                            <tr>{["Member","Plan","Amount","Method","Type","Date"].map(h=><th key={h} className="text-left px-4 py-3 whitespace-nowrap">{h}</th>)}</tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 bg-background">
                            {loading ? Array.from({length:5}).map((_,i)=><tr key={i}>{Array.from({length:6}).map((_,j)=><td key={j} className="px-4 py-3"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"/></td>)}</tr>)
                            : payments.length===0 ? <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400">No payments found{selectedBlock !== "all" ? ` for Block ${selectedBlock}` : ""}</td></tr>
                            : payments.map(p=>(
                                <tr key={p._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                    <td className="px-4 py-3"><p className="font-medium text-slate-800 dark:text-slate-100">{p.memberId?.name || "—"}</p><p className="text-xs text-slate-400">{p.memberId?.memberId}</p></td>
                                    <td className="px-4 py-3 text-slate-500">{p.planId?.name || "—"}</td>
                                    <td className="px-4 py-3 font-semibold text-emerald-600">₹{p.amount?.toLocaleString("en-IN")}</td>
                                    <td className="px-4 py-3 capitalize text-slate-500">{p.paymentMethod}</td>
                                    <td className="px-4 py-3"><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${typeColor[p.paymentType] || "bg-slate-100 dark:bg-slate-800 text-slate-500"}`}>{p.paymentType}</span></td>
                                    <td className="px-4 py-3 text-slate-400 text-xs">{new Date(p.createdAt).toLocaleDateString("en-IN")}</td>
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
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors font-medium shadow-sm"
                        >
                            <ChevronLeft className="h-4 w-4"/> Previous
                        </button>
                        <button
                            disabled={page >= totalPages}
                            onClick={() => setPage(p => p + 1)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 border-0 text-white disabled:bg-slate-100 disabled:text-slate-400 dark:disabled:bg-slate-800 dark:disabled:text-slate-600 transition-colors shadow-sm font-medium"
                        >
                            Next <ChevronRight className="h-4 w-4"/>
                        </button>
                    </div>
                </div>
            </div>


        </div>
    );
}
