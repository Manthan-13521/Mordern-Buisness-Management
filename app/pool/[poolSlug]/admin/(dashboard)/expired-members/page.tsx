"use client";

import { useState, useEffect } from "react";
import { Users, RotateCcw, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { usePoolType } from "@/components/pool/PoolTypeContext";
import { PoolTypeFilter } from "@/components/pool/PoolTypeFilter";


interface ExpiredMember {
    _id: string;
    memberId: string;
    name: string;
    phone: string;
    age?: number;
    expiryDate: string;
    qrToken: string;
    planId?: { name: string; price: number; durationDays?: number; durationHours?: number };
}

export default function ExpiredMembersPage() {
    const [members, setMembers] = useState<ExpiredMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const { selectedType } = usePoolType();

    const fetchExpired = async (p = 1) => {
        setLoading(true);
        setMembers([]); // Phase 2: Reset state before fetching
        setError(null);
        try {
            const res = await fetch(`/api/members/expired?page=${p}&limit=11&type=${selectedType}`, { cache: "no-store" });
            if (!res.ok) throw new Error("Failed to fetch");
            const data = await res.json();
            setMembers(data.members || []);
            setTotalPages(data.pagination?.totalPages || 1);
            setTotal(data.pagination?.total || 0);
            setPage(p);
        } catch (e: any) {
            setError(e.message || "Failed to load expired members");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchExpired(1); }, [selectedType]);

    const formatExpiry = (date: string) => new Date(date).toLocaleDateString("en-IN", {
        day: "2-digit", month: "short", year: "numeric"
    });

    const daysSinceExpiry = (date: string) => {
        const diff = Date.now() - new Date(date).getTime();
        return Math.floor(diff / (1000 * 60 * 60 * 24));
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <AlertCircle className="w-6 h-6 text-red-500" />
                        Expired Memberships
                    </h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {total} member{total !== 1 ? "s" : ""} with expired memberships
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <PoolTypeFilter />
                    <button
                        onClick={() => fetchExpired(page)}
                        className="inline-flex items-center gap-2 rounded-md bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 border-0 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-50 dark:hover:bg-blue-500/100 transition-colors"
                    >
                        <RotateCcw className="w-4 h-4" /> Refresh
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="animate-pulse space-y-3">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-16 bg-gray-200 bg-white dark:bg-white/5 dark:backdrop-blur-md dark:border dark:border-white/10 shadow-lg rounded-xl" />
                    ))}
                </div>
            ) : error ? (
                <div className="text-center py-16 text-red-500">{error}</div>
            ) : members.length === 0 ? (
                <div className="text-center py-16 flex flex-col items-center gap-3 text-gray-500">
                    <Users className="w-12 h-12 text-gray-300" />
                    <p className="font-medium">No expired members found.</p>
                    <p className="text-sm">All memberships are active!</p>
                </div>
            ) : (
                <>
                    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800 shadow">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800 bg-background">
                            <thead className="bg-gray-50 bg-white dark:bg-white/5 dark:backdrop-blur-md dark:border dark:border-white/10 shadow-lg">
                                <tr>
                                    {["Member ID", "Name", "Phone", "Plan", "Expiry Date", "Days Expired", "QR Token (ID)"].map(h => (
                                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {members.map((m) => (
                                    <tr key={m._id} className="hover:bg-red-50/50 dark:hover:bg-red-900/10 transition-colors">
                                        <td className="px-4 py-3 text-sm font-mono font-medium text-blue-600 dark:text-blue-400 dark:text-indigo-400">{m.memberId}</td>
                                        <td className="px-4 py-3">
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">{m.name}</div>
                                            {m.age && <div className="text-xs text-gray-500">Age: {m.age}</div>}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{m.phone}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                                            {m.planId?.name || <span className="text-gray-400 italic">No plan</span>}
                                            {m.planId?.price && <div className="text-xs text-gray-400">₹{m.planId.price}</div>}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-red-600 dark:text-red-400 font-medium">
                                            {formatExpiry(m.expiryDate)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                                                {daysSinceExpiry(m.expiryDate)}d ago
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-xs font-mono text-gray-400 dark:text-gray-600 max-w-[140px] truncate" title={m.qrToken}>
                                            {m.qrToken?.slice(0, 16)}…
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => fetchExpired(page - 1)}
                                    disabled={page <= 1}
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:bg-slate-50 disabled:text-slate-400 dark:disabled:bg-slate-900/50 dark:disabled:text-slate-600 transition-colors font-medium shadow-sm"
                                >
                                    <ChevronLeft className="h-4 w-4" /> Previous
                                </button>
                                <button
                                    onClick={() => fetchExpired(page + 1)}
                                    disabled={page >= totalPages}
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 border-0 text-white hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 dark:disabled:bg-slate-800 dark:disabled:text-slate-600 transition-colors shadow-sm font-medium"
                                >
                                    Next <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
