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
    expiredMembers: number;
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
        <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
            <div className={`absolute right-4 top-4 h-11 w-11 rounded-xl ${accent} flex items-center justify-center shadow-md`}>
                <Icon className="h-5 w-5 text-white" />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{value}</p>
            {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
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
            <div className="h-7 w-40 bg-slate-200 dark:bg-slate-700 rounded-xl" />
            <div className="grid grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-28 rounded-2xl bg-slate-200 dark:bg-slate-800" />
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
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Hostel overview — {monthName} {year}{blockLabel}
                        {selectedBlock !== "all" && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
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
            <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 shadow-sm mt-4">
                <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                        <BedDouble className="h-4 w-4 text-indigo-400" />
                        Occupancy{blockLabel}
                    </p>
                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                        {data.occupiedBeds} / {data.totalCapacity} beds
                    </span>
                </div>
                <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full transition-all duration-700"
                        style={{ width: `${Math.min(data.occupancyRate, 100)}%` }}
                    />
                </div>
                <p className="mt-1.5 text-xs text-slate-400">{data.occupancyRate}% occupied · {data.totalRooms} rooms configured</p>
            </div>

            {/* ── PRIMARY METRICS ── */}
            <div>
                <p className="text-xs font-bold uppercase tracking-widest text-blue-500 mb-3 mt-4">Key Metrics</p>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard icon={UserPlus}    label="Monthly Joined" value={data.monthlyJoined}              sub={`This ${monthName}`}      accent="bg-indigo-500" />
                    <StatCard icon={CalendarDays} label="Yearly Joined"  value={data.yearlyJoined}              sub={`Jan – Dec ${year}`}      accent="bg-violet-500" />
                    <StatCard icon={IndianRupee} label="Monthly Income"  value={fmt(data.monthlyIncome)}        sub={`This ${monthName}`}      accent="bg-emerald-500" />
                    <StatCard icon={TrendingUp}  label="Yearly Income"   value={fmt(data.yearlyIncome)}         sub={String(year)}             accent="bg-sky-500" />
                </div>
            </div>

            {/* ── SUPPLEMENTAL STATS ── */}
            <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">At a Glance</p>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard icon={Users}         label="Total Members"   value={data.totalMembers}   accent="bg-slate-500" />
                    <StatCard icon={Activity}      label="Active Members"  value={data.activeMembers}  accent="bg-emerald-500" />
                    <StatCard icon={UserX}         label="Expired Members" value={data.expiredMembers} accent="bg-red-500" />
                    <StatCard icon={AlertTriangle} label="Expiring (3d)"   value={data.expiringMembers} accent="bg-orange-500" />
                </div>
            </div>

            {/* ── EXPIRING SOON ── */}
            {data.expiringList.length > 0 && (
                <div className="rounded-2xl bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800/30 p-5">
                    <h2 className="text-sm font-bold text-orange-700 dark:text-orange-400 mb-4 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Expiring Within 3 Days
                    </h2>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="border-b border-orange-200 dark:border-orange-800/30 text-[11px] text-orange-600 dark:text-orange-500 uppercase tracking-wide">
                                    <th className="text-left py-2 pr-4">Name</th>
                                    <th className="text-left py-2 pr-4">Room</th>
                                    <th className="text-left py-2 pr-4">Phone</th>
                                    <th className="text-left py-2">Expiry</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-orange-100 dark:divide-orange-900/20">
                                {data.expiringList.map((m: any) => (
                                    <tr key={m._id} className="hover:bg-orange-100/40 dark:hover:bg-orange-900/10 transition">
                                        <td className="py-2.5 pr-4 font-medium text-slate-800 dark:text-slate-200">{m.name}</td>
                                        <td className="py-2.5 pr-4 text-slate-500 text-xs font-mono">{m.blockNo}-{m.floorNo}-{m.roomNo}</td>
                                        <td className="py-2.5 pr-4 text-slate-500">{m.phone}</td>
                                        <td className="py-2.5 text-orange-600 dark:text-orange-400 font-semibold">
                                            {new Date(m.planEndDate).toLocaleDateString("en-IN")}
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
