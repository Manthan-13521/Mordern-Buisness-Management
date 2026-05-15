"use client";

import { useEffect, useState, useCallback } from "react";
import {
    TrendingUp, TrendingDown, IndianRupee, Activity, Wallet, Receipt, BarChart3, Calendar
} from "lucide-react";
import { useHostelBlock } from "@/components/hostel/HostelBlockContext";
import { HostelBlockFilter } from "@/components/hostel/HostelBlockFilter";

const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function HostelAnalyticsPage() {
    const { selectedBlock } = useHostelBlock();
    const [dashData, setDashData] = useState<any>(null);
    const [monthlyIncome, setMonthlyIncome] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const blockParam = selectedBlock && selectedBlock !== "all" ? `?block=${encodeURIComponent(selectedBlock)}` : "";

            const [dRes, incomeRes] = await Promise.all([
                fetch(`/api/hostel/dashboard${blockParam}`),
                fetch(`/api/hostel/analytics/monthly-income${blockParam}`),
            ]);

            const [dJson, incomeJson] = await Promise.all([dRes.json(), incomeRes.json()]);

            setDashData(dJson || {});
            // SAFE: Ensure monthlyIncome is always a valid array with numeric values
            const rawIncome = Array.isArray(incomeJson) ? incomeJson : [];
            setMonthlyIncome(rawIncome.map((m: any) => {
                const cleaned: any = { month: m.month || '' };
                Object.keys(m).filter(k => k !== 'month').forEach(k => {
                    cleaned[k] = Number(m[k]) || 0;
                });
                return cleaned;
            }));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [selectedBlock]);

    useEffect(() => { fetchData(); }, [fetchData]);

    if (loading) return (
        <div className="space-y-6 animate-pulse">
            <div className="h-7 w-56 bg-slate-700 rounded-xl" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="h-32 rounded-2xl bg-[#020617]" />
                <div className="h-32 rounded-2xl bg-[#020617]" />
                <div className="h-32 rounded-2xl bg-[#020617]" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="h-32 rounded-2xl bg-[#020617]" />
                <div className="h-32 rounded-2xl bg-[#020617]" />
                <div className="h-32 rounded-2xl bg-[#020617]" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="h-72 rounded-2xl bg-[#020617]" />
                <div className="h-72 rounded-2xl bg-[#020617]" />
            </div>
        </div>
    );

    const fmt = (n: number) => `₹${(n || 0).toLocaleString("en-IN")}`;
    const now = new Date();
    const year = now.getFullYear();

    // Derived Metrics
    const totalRevenue = dashData?.totalRevenue || 0;
    const monthlyIncomeVal = dashData?.monthlyIncome || 0;
    const yearlyIncomeVal = dashData?.yearlyIncome || 0;
    const totalMembers = dashData?.totalMembers || 0;
    const activeMembers = dashData?.activeMembers || 0;
    const defaulterMembers = dashData?.defaulterMembers || 0;
    const checkoutMembers = dashData?.checkoutMembers || 0;

    // Cash Flow status
    const cashFlowStatus = totalRevenue > 0 ? "POSITIVE" : totalRevenue === 0 ? "NEUTRAL" : "NEGATIVE";

    // Build chart data for Revenue Trend (last 12 months)
    const chartMax = monthlyIncome.length > 0 
        ? Math.max(...monthlyIncome.map((m: any) => {
            const keys = Object.keys(m).filter(k => k !== "month");
            return keys.reduce((sum, k) => sum + (Number(m[k]) || 0), 0);
          }), 1)
        : 1;

    // Build yearly performance data (aggregate monthly income by month index)
    const yearlyPerf = MONTH_LABELS.map((label, idx) => {
        const monthKey = `${year}-${String(idx + 1).padStart(2, "0")}`;
        const found = monthlyIncome.find((m: any) => m.month === monthKey);
        if (!found) return { label, value: 0 };
        const keys = Object.keys(found).filter(k => k !== "month");
        const total = keys.reduce((sum, k) => sum + (Number(found[k]) || 0), 0);
        return { label, value: total };
    });
    const yearlyMax = Math.max(...yearlyPerf.map(y => y.value), 1);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Revenue Analytics</h1>
                    <p className="mt-1 text-sm text-[#6b7280]">Financial overview and performance metrics</p>
                </div>
                <HostelBlockFilter />
            </div>

            {/* Row 1: Revenue / Expenses / Net Profit */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Total Revenue */}
                <div className="rounded-2xl bg-[#020617]/80 border border-slate-700/50 p-5 relative overflow-hidden">
                    <div className="h-10 w-10 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-3">
                        <TrendingUp className="h-5 w-5 text-emerald-400" />
                    </div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Total Revenue</p>
                    <p className="mt-1 text-2xl font-bold text-white">{fmt(totalRevenue)}</p>
                </div>

                {/* Monthly Income */}
                <div className="rounded-2xl bg-[#020617]/80 border border-slate-700/50 p-5 relative overflow-hidden">
                    <div className="h-10 w-10 rounded-xl bg-orange-500/20 flex items-center justify-center mb-3">
                        <TrendingDown className="h-5 w-5 text-orange-400" />
                    </div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Monthly Income</p>
                    <p className="mt-1 text-2xl font-bold text-white">{fmt(monthlyIncomeVal)}</p>
                </div>

                {/* Yearly Income */}
                <div className="rounded-2xl bg-[#020617]/80 border border-slate-700/50 p-5 relative overflow-hidden">
                    <div className="h-10 w-10 rounded-xl bg-violet-500/20 flex items-center justify-center mb-3">
                        <IndianRupee className="h-5 w-5 text-violet-400" />
                    </div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Yearly Income</p>
                    <p className="mt-1 text-2xl font-bold text-white">{fmt(yearlyIncomeVal)}</p>
                </div>
            </div>

            {/* Row 2: Total Members / Members with Overdue Rent */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Total Members */}
                <div className="rounded-2xl bg-[#020617]/80 border border-slate-700/50 p-5">
                    <div className="flex items-center justify-between mb-1">
                        <div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                            <Wallet className="h-5 w-5 text-blue-400" />
                        </div>
                        <span className="text-[10px] font-semibold text-[#6b7280] uppercase">Total Members</span>
                    </div>
                    <p className="mt-2 text-2xl font-bold text-white">{totalMembers}</p>
                    <p className="text-xs text-[#6b7280] mt-0.5">Active: {activeMembers} · Checkout: {checkoutMembers}</p>
                </div>

                {/* Members with Overdue Rent */}
                <div className="rounded-2xl bg-[#020617]/80 border border-slate-700/50 p-5">
                    <div className="flex items-center justify-between mb-1">
                        <div className="h-10 w-10 rounded-xl bg-rose-500/20 flex items-center justify-center">
                            <Receipt className="h-5 w-5 text-rose-400" />
                        </div>
                        <span className="text-[10px] font-semibold text-[#6b7280] uppercase">Members with Overdue Rent</span>
                    </div>
                    <p className="mt-2 text-2xl font-bold text-white">{fmt(dashData?.totalDue || 0)}</p>
                    <p className="text-xs text-[#6b7280] mt-0.5">Total Due</p>
                </div>
            </div>

            {/* Row 3: Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Trend (Area-like bar chart) */}
                <div className="rounded-2xl bg-[#020617]/80 border border-slate-700/50 p-6">
                    <h2 className="text-sm font-bold text-white mb-6 flex items-center gap-2 uppercase tracking-wide">
                        <BarChart3 className="h-4 w-4 text-indigo-400" /> Revenue & Profit Trend
                    </h2>
                    {monthlyIncome.length === 0 ? (
                        <div className="flex items-center justify-center h-48 text-[#6b7280] text-sm">
                            No revenue data available yet
                        </div>
                    ) : (
                        <>
                            <div className="flex items-end gap-1 h-48">
                                {monthlyIncome.map((m: any, i: number) => {
                                    const keys = Object.keys(m).filter(k => k !== "month");
                                    const total = keys.reduce((sum, k) => sum + (Number(m[k]) || 0), 0);
                                    const pct = chartMax > 0 ? (total / chartMax) * 100 : 0;
                                    const monthLabel = m.month?.split("-")[1] || "";
                                    return (
                                        <div key={i} className="flex-1 flex flex-col items-center gap-1" title={`${m.month}: ${fmt(total)}`}>
                                            <div className="w-full relative flex-1 flex items-end">
                                                <div
                                                    className="w-full rounded-t-md bg-gradient-to-t from-indigo-600 to-indigo-400 transition-all duration-500 min-h-[2px]"
                                                    style={{ height: `${Math.max(pct, 2)}%` }}
                                                />
                                            </div>
                                            <span className="text-[9px] text-[#6b7280]">{monthLabel}</span>
                                        </div>
                                    );
                                })}
                            </div>
                            {monthlyIncome.length > 0 && (
                                <div className="flex justify-between mt-2 text-[10px] text-[#6b7280]">
                                    <span>{monthlyIncome[0]?.month}</span>
                                    <span>{monthlyIncome[monthlyIncome.length - 1]?.month}</span>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Yearly Performance */}
                <div className="rounded-2xl bg-[#020617]/80 border border-slate-700/50 p-6">
                    <h2 className="text-sm font-bold text-white mb-6 flex items-center gap-2 uppercase tracking-wide">
                        <Calendar className="h-4 w-4 text-emerald-400" /> Yearly Performance
                    </h2>
                    <div className="flex items-end gap-1.5 h-48">
                        {yearlyPerf.map((m, i) => {
                            const pct = (m.value / yearlyMax) * 100;
                            const isCurrent = i === now.getMonth();
                            return (
                                <div key={i} className="flex-1 flex flex-col items-center gap-1" title={`${m.label}: ${fmt(m.value)}`}>
                                    <div className="w-full relative flex-1 flex items-end">
                                        <div
                                            className={`w-full rounded-t-md transition-all duration-500 min-h-[2px] ${isCurrent ? "bg-gradient-to-t from-emerald-600 to-emerald-400" : m.value > 0 ? "bg-gradient-to-t from-emerald-700/60 to-emerald-500/60" : "bg-slate-700/40"}`}
                                            style={{ height: `${Math.max(pct, 2)}%` }}
                                        />
                                    </div>
                                    <span className={`text-[9px] ${isCurrent ? "text-emerald-400 font-bold" : "text-[#6b7280]"}`}>{m.label}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
