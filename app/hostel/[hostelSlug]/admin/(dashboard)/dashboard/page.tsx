"use client";

import { useEffect, useState, useCallback } from "react";
import {
    UserPlus, CalendarDays, IndianRupee, TrendingUp,
    AlertTriangle, Users, UserX, BedDouble, Activity,
} from "lucide-react";
import { useHostelBlock } from "@/components/hostel/HostelBlockContext";
import { HostelBlockFilter } from "@/components/hostel/HostelBlockFilter";

type DashData = {
    monthlyJoined: number;
    yearlyJoined: number;
    monthlyIncome: number;
    yearlyIncome: number;
    totalMembers: number;
    activeMembers: number;
    defaulterMembers: number;
    totalDue: number;
    checkoutMembers: number;
    expiringMembers: number;
    occupiedBeds: number;
    totalRooms: number;
    totalCapacity: number;
    occupancyRate: number;
    expiringList: any[];
};

function StatCard({
    icon: Icon, label, value, sub, accent,
}: {
    icon: any; label: string; value: string | number; sub?: string; accent: string;
}) {
    return (
        <div className="relative overflow-hidden rounded-2xl bg-[#0b1220] border border-[#1f2937] p-5 shadow-sm">
            <div className={`absolute right-4 top-4 h-11 w-11 rounded-xl ${accent} flex items-center justify-center shadow-md`}>
                <Icon className="h-5 w-5 text-white" />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#9ca3af]">{label}</p>
            <p className="mt-2 text-3xl font-bold text-[#f9fafb]">{value}</p>
            {sub && <p className="mt-1 text-xs text-[#6b7280]">{sub}</p>}
        </div>
    );
}

export default function HostelDashboardPage() {
    const { selectedBlock } = useHostelBlock();
    const [data, setData] = useState<DashData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchDashboard = useCallback(() => {
        setLoading(true);
        setError("");
        const blockParam = selectedBlock && selectedBlock !== "all"
            ? `?block=${encodeURIComponent(selectedBlock)}`
            : "";
        fetch(`/api/hostel/dashboard${blockParam}`)
            .then(r => r.json())
            .then(d => { setData(d); setLoading(false); })
            .catch(() => { setError("Failed to load dashboard"); setLoading(false); });
    }, [selectedBlock]);

    useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

    const now = new Date();
    const monthName = now.toLocaleString("en-IN", { month: "long" });
    const year = now.getFullYear();

    if (loading) return (
        <div className="space-y-6 animate-pulse">
            <div className="h-7 w-40 bg-[#1f2937] rounded-xl" />
            <div className="grid grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-28 rounded-2xl bg-[#0b1220]" />
                ))}
            </div>
        </div>
    );

    if (error || !data) return (
        <div className="flex flex-col items-center justify-center py-24 text-red-500 gap-3">
            <AlertTriangle className="h-8 w-8" />
            <p className="font-medium">{error || "No data available"}</p>
        </div>
    );

    const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;
    const blockLabel = selectedBlock !== "all" ? ` · Block ${selectedBlock}` : "";

    return (
        <div className="space-y-8">
            {/* Title */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[#f9fafb]">Dashboard</h1>
                    <p className="mt-1 text-sm text-[#9ca3af]">
                        Hostel overview — {monthName} {year}{blockLabel}
                        {selectedBlock !== "all" && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#8b5cf6]/10 text-[#8b5cf6]">
                                Live data
                            </span>
                        )}
                    </p>
                </div>
                <div className="flex-shrink-0">
                    <HostelBlockFilter />
                </div>
            </div>

            {/* ── OCCUPANCY BAR ── */}
            <div className="rounded-2xl bg-[#0b1220] border border-[#1f2937] p-5 shadow-sm mt-4">
                <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-[#f9fafb] flex items-center gap-2">
                        <BedDouble className="h-4 w-4 text-[#8b5cf6]" />
                        Occupancy{blockLabel}
                    </p>
                    <span className="text-sm font-bold text-[#8b5cf6]">
                        {data.occupiedBeds} / {data.totalCapacity} beds
                    </span>
                </div>
                <div className="w-full h-3 bg-[#1f2937] rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] rounded-full transition-all duration-700"
                        style={{ width: `${Math.min(data.occupancyRate, 100)}%` }}
                    />
                </div>
                <p className="mt-1.5 text-xs text-[#6b7280]">{data.occupancyRate}% occupied · {data.totalRooms} rooms configured</p>
            </div>

            {/* ── PRIMARY METRICS ── */}
            <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#8b5cf6] mb-3 mt-4">Key Metrics</p>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard icon={UserPlus}    label="Monthly Joined" value={data.monthlyJoined}              sub={`This ${monthName}`}      accent="bg-indigo-500" />
                    <StatCard icon={CalendarDays} label="Yearly Joined"  value={data.yearlyJoined}              sub={`Jan – Dec ${year}`}      accent="bg-violet-500" />
                    <StatCard icon={IndianRupee} label="Monthly Income"  value={fmt(data.monthlyIncome)}        sub={`This ${monthName}`}      accent="bg-emerald-500" />
                    <StatCard icon={TrendingUp}  label="Yearly Income"   value={fmt(data.yearlyIncome)}         sub={String(year)}             accent="bg-sky-500" />
                </div>
            </div>

            {/* ── SUPPLEMENTAL STATS ── */}
            <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#9ca3af] mb-3">At a Glance</p>
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    <StatCard icon={Users}         label="Total Members"   value={data.totalMembers}   accent="bg-slate-500" />
                    <StatCard icon={Activity}      label="Active Members"  value={data.activeMembers}  accent="bg-emerald-500" />
                    <StatCard icon={AlertTriangle} label="Members with Overdue Rent" value={fmt(data.totalDue || 0)} sub="Total Due" accent="bg-orange-600" />
                    <StatCard icon={UserX}         label="Checkout Members" value={data.checkoutMembers} accent="bg-red-500" />
                    <StatCard icon={AlertTriangle} label="Expiring (3d)"   value={data.expiringMembers} accent="bg-orange-400" />
                </div>
            </div>

            {/* ── EXPIRING SOON ── */}
            {data.expiringList.length > 0 && (
                <div className="rounded-2xl bg-[#0b1220] border border-orange-500/20 p-5">
                    <h2 className="text-sm font-bold text-orange-400 mb-4 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Expiring Within 3 Days
                    </h2>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="border-b border-[#1f2937] text-[11px] text-orange-500 uppercase tracking-wide">
                                    <th className="text-left py-2 pr-4">Name</th>
                                    <th className="text-left py-2 pr-4">Room</th>
                                    <th className="text-left py-2 pr-4">Phone</th>
                                    <th className="text-left py-2">Expiry</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#1f2937]">
                                {data.expiringList.map((m: any) => (
                                    <tr key={m._id} className="hover:bg-[#8b5cf6]/5 transition">
                                        <td className="py-2.5 pr-4 font-medium text-[#f9fafb]">{m.name}</td>
                                        <td className="py-2.5 pr-4 text-[#9ca3af] text-xs font-mono">{m.blockNo}-{m.floorNo}-{m.roomNo}</td>
                                        <td className="py-2.5 pr-4 text-[#9ca3af]">{m.phone}</td>
                                        <td className="py-2.5 text-orange-400 font-semibold">
                                            {new Date(m.due_date).toLocaleDateString("en-IN")}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
