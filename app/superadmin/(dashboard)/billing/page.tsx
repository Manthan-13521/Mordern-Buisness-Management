"use client";

import { useEffect, useState } from "react";
import { CreditCard, RefreshCw, Search } from "lucide-react";

export default function PlatformBillingDashboard() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchBilling = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/superadmin/dashboard");
            if (res.ok) {
                const data = await res.json();
                setLogs(data.billingLogs || []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchBilling(); }, []);

    const totalRevenue = logs.reduce((sum, b) => sum + (b.amount || 0), 0);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
                        <CreditCard className="w-6 h-6 text-emerald-400" />
                        Platform Billing & Invoices
                    </h1>
                    <p className="text-neutral-400 mt-1 text-sm">All SaaS subscription payments and manual activations.</p>
                </div>
                <button
                    onClick={fetchBilling}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-neutral-300 hover:bg-white/10 hover:text-white transition-all text-sm font-medium disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
                </button>
            </div>

            {/* Summary Card */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-600/15 to-emerald-600/5 border border-emerald-500/20">
                    <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">Total Collected</p>
                    <p className="text-3xl font-bold text-emerald-400 mt-2">₹{totalRevenue.toLocaleString("en-IN")}</p>
                </div>
                <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-600/15 to-blue-600/5 border border-blue-500/20">
                    <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">Total Transactions</p>
                    <p className="text-3xl font-bold text-blue-400 mt-2">{logs.length}</p>
                </div>
                <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-600/15 to-purple-600/5 border border-purple-500/20">
                    <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">UPI Activations</p>
                    <p className="text-3xl font-bold text-purple-400 mt-2">{logs.filter(b => b.method === "upi").length}</p>
                </div>
            </div>

            {/* Transaction Table */}
            <div className="bg-neutral-900/80 border border-white/5 rounded-2xl shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/5">
                                <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-neutral-400">#</th>
                                <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-neutral-400">Timestamp</th>
                                <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-neutral-400">Org ID</th>
                                <th className="text-right px-6 py-4 text-xs font-bold uppercase tracking-wider text-neutral-400">Amount</th>
                                <th className="text-center px-6 py-4 text-xs font-bold uppercase tracking-wider text-neutral-400">Method</th>
                                <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-neutral-400">Billing Period</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && <tr><td colSpan={6} className="text-center py-12 text-neutral-500">Loading...</td></tr>}
                            {!loading && logs.length === 0 && <tr><td colSpan={6} className="text-center py-12 text-neutral-500">No billing records yet. Revenue will appear here after first subscription activation.</td></tr>}
                            {!loading && logs.map((b, i) => (
                                <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                                    <td className="px-6 py-4 text-neutral-500 font-mono text-xs">{i + 1}</td>
                                    <td className="px-6 py-4 text-neutral-300 font-medium text-xs">
                                        {new Date(b.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                    </td>
                                    <td className="px-6 py-4 text-neutral-400 font-mono text-xs">{b.orgId?.toString().slice(-8) || "—"}</td>
                                    <td className="px-6 py-4 text-right font-bold text-emerald-400">₹{b.amount?.toLocaleString("en-IN")}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`text-xs font-bold uppercase px-2.5 py-1 rounded-md border ${
                                            b.method === "upi"
                                                ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                                                : b.method === "razorpay"
                                                ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                                : b.method === "cash"
                                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                                : b.method === "bank_transfer"
                                                ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                                                : b.method === "card"
                                                ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                                : "bg-neutral-500/10 text-neutral-400 border-neutral-500/20"
                                        }`}>
                                            {b.paymentMode || b.method}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-neutral-400 text-xs">
                                        {new Date(b.periodStart).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                                        {" → "}
                                        {new Date(b.periodEnd).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
