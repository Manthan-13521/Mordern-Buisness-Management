"use client";

import { useEffect, useState, useCallback } from "react";
import { History, RefreshCw, ChevronLeft, ChevronRight, UserPlus, CreditCard } from "lucide-react";
import { useHostelBlock } from "@/components/hostel/HostelBlockContext";
import { HostelBlockFilter } from "@/components/hostel/HostelBlockFilter";

type RegistrationLog = { _id: string; memberName: string; roomNumber: string; join_date: string; createdAt: string; createdBy: string; };
type PaymentLog = { _id: string; memberName: string; amount: number; paymentType: string; payment_date: string; createdAt: string; createdBy: string; };

export default function LogsPage() {
    const { selectedBlock } = useHostelBlock();
    const [activeTab, setActiveTab] = useState<"registrations" | "payments">("registrations");
    const [registrationLogs, setRegistrationLogs] = useState<RegistrationLog[]>([]);
    const [paymentLogs, setPaymentLogs] = useState<PaymentLog[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [limit] = useState(12);
    const [loading, setLoading] = useState(true);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        const endpoint = activeTab === "registrations" ? "registrations" : "payments";
        const blockParam = selectedBlock && selectedBlock !== "all"
            ? `&block=${encodeURIComponent(selectedBlock)}`
            : "";
        try {
            const r = await fetch(`/api/hostel/logs/${endpoint}?page=${page}&limit=${limit}${blockParam}`);
            const d = await r.json();
            if (activeTab === "registrations") setRegistrationLogs(d.data || []);
            else setPaymentLogs(d.data || []);
            setTotal(d.total || 0);
        } catch (error) {
            console.error("Failed to fetch logs", error);
        } finally {
            setLoading(false);
        }
    }, [activeTab, page, limit, selectedBlock]);

    useEffect(() => { fetchLogs(); }, [fetchLogs]);
    // Reset page on tab or block filter change
    useEffect(() => { setPage(1); }, [activeTab, selectedBlock]);

    const totalPages = Math.ceil(total / limit);

    const renderPagination = () => (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-sm text-[#6b7280]">
            <div className="flex items-center gap-4">
                <span>Page {page} of {totalPages || 1}</span>
            </div>
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
    );

    const emptyLabel = selectedBlock !== "all"
        ? `No ${activeTab} logs found for Block ${selectedBlock}`
        : `No ${activeTab} logs found`;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-[#f9fafb] flex items-center gap-2">
                        <History className="h-6 w-6 text-blue-500"/>
                        Activity Logs
                    </h1>
                    <p className="text-sm text-[#6b7280]">
                        View detailed audit history of all hostel operations
                        {selectedBlock !== "all" && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400">
                                Block {selectedBlock}
                            </span>
                        )}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <HostelBlockFilter />
                    <button onClick={fetchLogs} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#1f2937] hover:bg-[#8b5cf6]/5 text-sm font-medium transition-colors bg-[#0b1220] shadow-sm">
                        <RefreshCw className={`h-4 w-4 text-[#6b7280] ${loading ? "animate-spin" : ""}`}/>
                        Refresh
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-2xl w-fit">
                <button
                    onClick={() => setActiveTab("registrations")}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === "registrations" ? "bg-[#0b1220] text-blue-600 shadow-sm" : "text-[#6b7280] hover:text-[#f9fafb]"}`}
                >
                    <UserPlus className="h-4 w-4"/> Registrations
                </button>
                <button
                    onClick={() => setActiveTab("payments")}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === "payments" ? "bg-[#0b1220] text-emerald-400 shadow-sm" : "text-[#6b7280] hover:text-[#f9fafb]"}`}
                >
                    <CreditCard className="h-4 w-4"/> Payments
                </button>
            </div>

            <div className="rounded-2xl bg-[#0b1220] border border-[#1f2937] shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-[#020617]/50 text-[#6b7280] font-medium border-b border-slate-100">
                            {activeTab === "registrations" ? (
                                <tr>
                                    <th className="px-6 py-4">Member Name</th>
                                    <th className="px-6 py-4">Room</th>
                                    <th className="px-6 py-4">Join Date</th>
                                    <th className="px-6 py-4">Admin</th>
                                    <th className="px-6 py-4">Created At</th>
                                </tr>
                            ) : (
                                <tr>
                                    <th className="px-6 py-4">Member Name</th>
                                    <th className="px-6 py-4">Amount</th>
                                    <th className="px-6 py-4">Type</th>
                                    <th className="px-6 py-4">Payment Date</th>
                                    <th className="px-6 py-4">Admin</th>
                                    <th className="px-6 py-4">Created At</th>
                                </tr>
                            )}
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={6} className="px-6 py-4">
                                            <div className="h-4 bg-slate-100 rounded w-full"/>
                                        </td>
                                    </tr>
                                ))
                            ) : activeTab === "registrations" ? (
                                registrationLogs.length === 0 ? (
                                    <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">{emptyLabel}</td></tr>
                                ) : registrationLogs.map(log => (
                                    <tr key={log._id} className="hover:bg-[#8b5cf6]/5/50/20 transition-colors">
                                        <td className="px-6 py-4 font-medium text-[#f9fafb]">{log.memberName}</td>
                                        <td className="px-6 py-4 text-slate-600">{log.roomNumber}</td>
                                        <td className="px-6 py-4 text-slate-600">{new Date(log.join_date).toLocaleDateString("en-IN")}</td>
                                        <td className="px-6 py-4 text-[#6b7280] text-xs">{log.createdBy}</td>
                                        <td className="px-6 py-4 text-slate-400 text-xs">{new Date(log.createdAt).toLocaleString("en-IN")}</td>
                                    </tr>
                                ))
                            ) : (
                                paymentLogs.length === 0 ? (
                                    <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">{emptyLabel}</td></tr>
                                ) : paymentLogs.map(log => (
                                    <tr key={log._id} className="hover:bg-[#8b5cf6]/5/50/20 transition-colors">
                                        <td className="px-6 py-4 font-medium text-[#f9fafb]">{log.memberName}</td>
                                        <td className="px-6 py-4 font-semibold text-emerald-400">₹{log.amount}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                                                log.paymentType === "refund" ? "bg-rose-500/10 text-rose-500" :
                                                log.paymentType === "initial" || log.paymentType === "renewal" ? "bg-emerald-100 text-emerald-600" :
                                                "bg-blue-500/10 text-blue-600"
                                            }`}>
                                                {log.paymentType}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">{new Date(log.payment_date).toLocaleDateString("en-IN")}</td>
                                        <td className="px-6 py-4 text-[#6b7280] text-xs">{log.createdBy}</td>
                                        <td className="px-6 py-4 text-slate-400 text-xs">{new Date(log.createdAt).toLocaleString("en-IN")}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {renderPagination()}
            </div>
        </div>
    );
}
