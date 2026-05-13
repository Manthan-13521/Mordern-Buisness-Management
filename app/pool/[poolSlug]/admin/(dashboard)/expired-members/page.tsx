"use client";

import { useState, useEffect } from "react";
import { 
    Users, 
    RotateCcw, 
    AlertCircle, 
    ChevronLeft, 
    ChevronRight,
    Search,
    UserX,
    RefreshCw,
    Clock,
    ShieldAlert
} from "lucide-react";
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
    planId?: { 
        name: string; 
        price: number; 
        durationDays?: number; 
        durationHours?: number 
    };
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
        setError(null);
        try {
            const res = await fetch(`/api/members/expired?page=${p}&limit=11&type=${selectedType}`, { cache: "no-store" });
            if (!res.ok) throw new Error("Could not retrieve expired members. Please check your connection.");
            const data = await res.json();
            setMembers(data.members || []);
            setTotalPages(data.pagination?.totalPages || 1);
            setTotal(data.pagination?.total || 0);
            setPage(p);
        } catch (e: any) {
            setError(e.message || "An unexpected error occurred while loading member data.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { 
        fetchExpired(1); 
    }, [selectedType]);

    const formatExpiry = (date: string) => {
        if (!date) return "—";
        return new Date(date).toLocaleDateString("en-IN", {
            day: "2-digit", 
            month: "short", 
            year: "numeric"
        });
    };

    const daysSinceExpiry = (date: string) => {
        if (!date) return 0;
        const diff = Date.now() - new Date(date).getTime();
        return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
    };

    if (loading && page === 1 && members.length === 0) {
        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2">
                        <div className="h-8 w-64 bg-[#0b1220] border border-[#1f2937] rounded-lg animate-pulse" />
                        <div className="h-4 w-48 bg-[#0b1220] border border-[#1f2937] rounded-md animate-pulse" />
                    </div>
                    <div className="h-10 w-32 bg-[#0b1220] border border-[#1f2937] rounded-lg animate-pulse" />
                </div>
                <div className="grid grid-cols-1 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-20 bg-[#0b1220] border border-[#1f2937] rounded-2xl animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 animate-in zoom-in duration-300">
                <div className="w-20 h-20 rounded-3xl bg-red-500/10 flex items-center justify-center mb-6 border border-red-500/20">
                    <ShieldAlert className="w-10 h-10 text-red-400" />
                </div>
                <h2 className="text-xl font-bold text-[#f9fafb] mb-2">Sync Error</h2>
                <p className="text-[#9ca3af] max-w-md mb-8">{error}</p>
                <button
                    onClick={() => fetchExpired(page)}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-bold transition-all shadow-lg shadow-[#8b5cf6]/20"
                >
                    <RefreshCw className="w-5 h-5" />
                    Retry Fetching
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20">
                            <Clock className="w-6 h-6 text-red-400" />
                        </div>
                        <h1 className="text-2xl font-bold text-[#f9fafb] tracking-tight">
                            Expired Memberships
                        </h1>
                    </div>
                    <p className="mt-2 text-sm font-medium text-[#9ca3af]">
                        Showing <span className="text-[#f9fafb]">{total}</span> legacy records requiring renewal or archival.
                    </p>
                </div>
                
                <div className="flex items-center gap-3">
                    <PoolTypeFilter />
                    <button
                        onClick={() => fetchExpired(page)}
                        disabled={loading}
                        className="p-2.5 rounded-xl bg-[#0b1220] border border-[#1f2937] text-[#9ca3af] hover:text-[#f9fafb] hover:bg-[#111827] transition-all disabled:opacity-50"
                        title="Refresh Data"
                    >
                        <RotateCcw className={`w-5 h-5 ${loading ? "animate-spin text-[#8b5cf6]" : ""}`} />
                    </button>
                </div>
            </div>

            {members.length === 0 ? (
                <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-6 bg-[#0b1220] border border-[#1f2937] rounded-3xl animate-in fade-in duration-700">
                    <div className="w-24 h-24 rounded-full bg-[#8b5cf6]/5 flex items-center justify-center mb-6 border border-[#8b5cf6]/10">
                        <Users className="w-12 h-12 text-[#8b5cf6]/40" />
                    </div>
                    <h3 className="text-xl font-bold text-[#f9fafb] mb-2">No Expired Members</h3>
                    <p className="text-[#9ca3af] max-w-sm">
                        Great work! All active members are currently within their subscription validity period.
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Table Container */}
                    <div className="overflow-hidden rounded-2xl border border-[#1f2937] bg-[#0b1220] shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-[#020617] border-b border-[#1f2937]">
                                        <th className="px-6 py-4 text-xs font-bold text-[#9ca3af] uppercase tracking-widest">Member Entity</th>
                                        <th className="px-6 py-4 text-xs font-bold text-[#9ca3af] uppercase tracking-widest">Subscription Plan</th>
                                        <th className="px-6 py-4 text-xs font-bold text-[#9ca3af] uppercase tracking-widest text-center">Status</th>
                                        <th className="px-6 py-4 text-xs font-bold text-[#9ca3af] uppercase tracking-widest">Expiry Timeline</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#1f2937]">
                                    {members.map((member) => (
                                        <tr key={member._id} className="group hover:bg-[#8b5cf6]/5 transition-all">
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-[#020617] border border-[#1f2937] flex items-center justify-center text-[#8b5cf6] font-bold shadow-inner group-hover:border-[#8b5cf6]/30 transition-colors">
                                                        {member.name?.[0] || "?"}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-[#f9fafb] group-hover:text-[#8b5cf6] transition-colors">{member.name}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-[10px] font-mono text-[#6b7280] bg-[#020617] px-1.5 py-0.5 rounded border border-[#1f2937]">{member.memberId}</span>
                                                            <span className="text-xs text-[#6b7280]">{member.phone}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="space-y-1">
                                                    <p className="text-sm font-semibold text-[#f9fafb]">
                                                        {member.planId?.name || <span className="text-[#6b7280] italic">Legacy Plan</span>}
                                                    </p>
                                                    {member.planId?.price && (
                                                        <p className="text-xs font-medium text-[#8b5cf6]">₹{member.planId.price.toLocaleString("en-IN")}</p>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/20">
                                                    <AlertCircle className="w-3 h-3" />
                                                    Expired
                                                </span>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div>
                                                    <p className="text-sm font-bold text-red-400">{formatExpiry(member.expiryDate)}</p>
                                                    <p className="text-xs font-medium text-[#6b7280] mt-0.5 italic">
                                                        {daysSinceExpiry(member.expiryDate)} days overdue
                                                    </p>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between bg-[#0b1220] border border-[#1f2937] rounded-2xl p-4 shadow-sm">
                            <p className="text-xs font-bold text-[#9ca3af] uppercase tracking-widest">
                                Page <span className="text-[#f9fafb]">{page}</span> of <span className="text-[#f9fafb]">{totalPages}</span>
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => fetchExpired(page - 1)}
                                    disabled={page <= 1 || loading}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#1f2937] bg-[#020617] text-[#9ca3af] hover:text-[#f9fafb] hover:bg-[#111827] disabled:opacity-30 disabled:hover:bg-[#020617] transition-all text-xs font-bold shadow-sm"
                                >
                                    <ChevronLeft className="h-4 w-4" /> 
                                    Prev
                                </button>
                                <button
                                    onClick={() => fetchExpired(page + 1)}
                                    disabled={page >= totalPages || loading}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#8b5cf6] hover:bg-[#7c3aed] text-white disabled:opacity-30 transition-all text-xs font-bold shadow-lg shadow-[#8b5cf6]/20"
                                >
                                    Next 
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
