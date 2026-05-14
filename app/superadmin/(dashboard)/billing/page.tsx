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
    const manualEntries = logs.filter(b => b.paymentMode && (b.paymentMode.includes("Admin:") || b.method === "manual" || b.method === "cash"));

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
                        <CreditCard className="w-6 h-6 text-emerald-400" />
                        Platform Billing & Invoices
                    </h1>
                    <p className="text-[#9ca3af] mt-1 text-sm font-medium">All SaaS subscription payments and manual activations.</p>
                </div>
                <button
                    onClick={fetchBilling}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0b1220] border border-[#1f2937] text-[#9ca3af] hover:bg-[#8b5cf6]/10 hover:text-[#f9fafb] transition-all text-sm font-bold disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
                </button>
            </div>

            {/* Summary Card */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="p-6 rounded-2xl bg-[#0b1220] border border-[#1f2937]">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#9ca3af]">Total Collected</p>
                    <p className="text-3xl font-bold text-emerald-400 mt-2">₹{totalRevenue.toLocaleString("en-IN")}</p>
                </div>
                <div className="p-6 rounded-2xl bg-[#0b1220] border border-[#1f2937]">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#9ca3af]">Total Transactions</p>
                    <p className="text-3xl font-bold text-blue-400 mt-2">{logs.length}</p>
                </div>
                <div className="p-6 rounded-2xl bg-[#0b1220] border border-[#1f2937]">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#9ca3af]">UPI Activations</p>
                    <p className="text-3xl font-bold text-purple-400 mt-2">{logs.filter(b => b.method === "upi").length}</p>
                </div>
                <div className="p-6 rounded-2xl bg-[#0b1220] border border-[#1f2937]">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#9ca3af]">Manual Entries</p>
                    <p className="text-3xl font-bold text-amber-400 mt-2">{manualEntries.length}</p>
                </div>
            </div>

            {/* Transaction Table */}
            <div className="bg-[#0b1220] border border-[#1f2937] rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-[#1f2937]">
                                <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#9ca3af]">#</th>
                                <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#9ca3af]">Timestamp</th>
                                <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#9ca3af]">Org ID</th>
                                <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#9ca3af]">Business</th>
                                <th className="text-right px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#9ca3af]">Amount</th>
                                <th className="text-center px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#9ca3af]">Method</th>
                                <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#9ca3af]">Payer</th>
                                <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#9ca3af]">Billing Period</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && <tr><td colSpan={7} className="text-center py-12 text-[#6b7280]">Loading...</td></tr>}
                            {!loading && logs.length === 0 && <tr><td colSpan={7} className="text-center py-12 text-[#6b7280]">No billing records yet. Revenue will appear here after first subscription activation.</td></tr>}
                            {!loading && logs.map((b, i) => {
                                // Extract payer name from paymentMode like "UPI (Admin: John Doe)"
                                const payerMatch = b.paymentMode?.match(/\(Admin:\s*(.+?)\)/);
                                const payerName = payerMatch ? payerMatch[1] : "—";
                                const isManual = b.paymentMode?.includes("Admin:");

                                return (
                                    <tr key={i} className="border-b border-[#1f2937]/50 hover:bg-[#8b5cf6]/5 transition-colors">
                                        <td className="px-6 py-4 text-[#6b7280] font-mono text-xs">{i + 1}</td>
                                        <td className="px-6 py-4 text-[#9ca3af] font-medium text-xs">
                                            {new Date(b.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                        </td>
                                        <td className="px-6 py-4 text-[#9ca3af] font-mono text-xs">{b.orgId?._id?.toString().slice(-8) || b.orgId?.toString().slice(-8) || "—"}</td>
                                        <td className="px-6 py-4 text-[#f9fafb] font-bold text-xs uppercase tracking-tight">{b.orgName || "—"}</td>
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
                                                    : b.method === "manual"
                                                    ? "bg-orange-500/10 text-orange-400 border-orange-500/20"
                                                    : "bg-neutral-500/10 text-[#9ca3af] border-neutral-500/20"
                                            }`}>
                                                {b.method}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-xs">
                                            {isManual ? (
                                                <span className="text-amber-400 font-semibold">{payerName}</span>
                                            ) : (
                                                <span className="text-[#6b7280]">—</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-[#9ca3af] text-xs">
                                            {new Date(b.periodStart).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                                            {" → "}
                                            {new Date(b.periodEnd).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
