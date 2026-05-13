"use client";

import { useEffect, useState } from "react";
import {
    DollarSign, TrendingUp, Users, AlertTriangle, Clock, Gift,
    Activity, Building2, Droplets, Plus, ShieldAlert, CreditCard,
    RefreshCw, Zap, XCircle, CheckCircle2, ArrowUpRight, BarChart3,
    BadgePercent, Target, Flame, Bell
} from "lucide-react";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

interface DashboardData {
    kpis: {
        totalRevenue: number;
        mrr: number;
        activeOrgs: number;
        trialOrgs: number;
        expiringSoon: number;
        expiredOrgs: number;
        totalPools: number;
        totalHostels: number;
        totalMembers: number;
        conversionRate: number;
    };
    orgHealth: any[];
    referralIntel: any[];
    billingLogs: any[];
    dailySignups: any[];
    alerts: { type: string; message: string }[];
}

export default function SuperAdminDashboard() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [chartData, setChartData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"overview" | "orgs" | "referrals" | "billing">("overview");

    const fetchDashboard = async () => {
        setLoading(true);
        try {
            const [res, chartRes] = await Promise.all([
                fetch("/api/superadmin/dashboard"),
                fetch("/api/superadmin/dashboard/chart")
            ]);
            if (res.ok) setData(await res.json());
            if (chartRes.ok) setChartData(await chartRes.json());
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboard();
        // Live data: auto-refresh every 30 seconds
        const interval = setInterval(fetchDashboard, 30000);
        return () => clearInterval(interval);
    }, []);

    if (loading && !data) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                    <p className="text-[#9ca3af] text-sm font-medium animate-pulse">Loading Command Center...</p>
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <p className="text-red-400">Failed to load dashboard data.</p>
            </div>
        );
    }

    const { kpis, orgHealth, referralIntel, billingLogs, dailySignups, alerts } = data;
    const bestCode = referralIntel.length > 0 ? referralIntel[0] : null;

    // Build org name lookup from orgHealth for billing display
    const orgNameMap: Record<string, string> = {};
    orgHealth.forEach((o: any) => { if (o._id) orgNameMap[o._id.toString()] = o.name; });

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-[#f9fafb]">SaaS Command Center</h1>
                    <p className="text-[#9ca3af] mt-1 text-sm font-medium">Revenue · Organizations · Growth · Risk — everything in 5 seconds.</p>
                </div>
                <button
                    onClick={fetchDashboard}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0b1220] border border-[#1f2937] text-[#9ca3af] hover:bg-[#8b5cf6]/10 hover:text-[#f9fafb] transition-all text-sm font-bold disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                    Refresh
                </button>
            </div>

            {/* ── Alert Banner ── */}
            {alerts.length > 0 && (
                <div className="space-y-2">
                    {alerts.map((a, i) => (
                        <div key={i} className={`flex items-center gap-3 px-5 py-3.5 rounded-xl border text-sm font-medium ${
                            a.type === "danger"
                                ? "bg-red-500/10 border-red-500/20 text-red-400"
                                : a.type === "warning"
                                ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                                : "bg-blue-500/10 border-blue-500/20 text-blue-400"
                        }`}>
                            <Bell className="w-4 h-4 shrink-0" />
                            {a.message}
                        </div>
                    ))}
                </div>
            )}

            {/* ── Tabs ── */}
            <div className="flex overflow-x-auto gap-1 bg-[#0b1220] p-1 rounded-xl border border-[#1f2937] w-fit">
                {(["overview", "orgs", "referrals", "billing"] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-5 py-2 whitespace-nowrap rounded-lg text-sm font-semibold capitalize transition-all ${
                            activeTab === tab
                                ? "bg-[#8b5cf6] text-white shadow-lg shadow-[#8b5cf6]/25"
                                : "text-[#9ca3af] hover:text-[#f9fafb] hover:bg-[#8b5cf6]/5"
                        }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* ── TAB: Overview ── */}
            {activeTab === "overview" && (
                <div className="space-y-8">
                    {/* Row 1: Revenue KPIs */}
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-4 flex items-center gap-2"><DollarSign className="w-3.5 h-3.5" /> Revenue Intelligence</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                            <KpiCard title="Total SaaS Revenue" value={`₹${kpis.totalRevenue.toLocaleString("en-IN")}`} icon={<DollarSign className="w-5 h-5" />} color="emerald" />
                            <KpiCard title="MRR (30 days)" value={`₹${kpis.mrr.toLocaleString("en-IN")}`} icon={<TrendingUp className="w-5 h-5" />} color="blue" />
                            <KpiCard title="Active Organizations" value={kpis.activeOrgs.toString()} icon={<CheckCircle2 className="w-5 h-5" />} color="green" />
                            <KpiCard title="Trial Users" value={kpis.trialOrgs.toString()} icon={<Clock className="w-5 h-5" />} color="amber" subtitle="Conversion target" />
                            <KpiCard title="Expiring Soon" value={kpis.expiringSoon.toString()} icon={<AlertTriangle className="w-5 h-5" />} color="red" subtitle="Churn risk" />
                        </div>
                    </div>

                    {/* Row 2: Platform Stats */}
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-4 flex items-center gap-2"><Activity className="w-3.5 h-3.5" /> Platform Health</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <MiniStat label="Pools" value={kpis.totalPools} icon={<Droplets className="w-4 h-4" />} />
                            <MiniStat label="Hostels" value={kpis.totalHostels} icon={<Building2 className="w-4 h-4" />} />
                            <MiniStat label="Total Members" value={kpis.totalMembers} icon={<Users className="w-4 h-4" />} />
                            <MiniStat label="Conversion Rate" value={`${kpis.conversionRate}%`} icon={<Target className="w-4 h-4" />} />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* System Overview Line Graph */}
                        <div className="lg:col-span-2 bg-[#0b1220] border border-[#1f2937] rounded-2xl p-6 shadow-sm overflow-x-auto">
                            <h3 className="text-base font-semibold text-white mb-5 flex items-center gap-2">
                                <BarChart3 className="w-4 h-4 text-blue-400" /> System Ecosystem Growth
                            </h3>
                            <div className="h-72 min-w-[500px]">
                                {chartData.length === 0 ? (
                                    <div className="h-full flex items-center justify-center"><p className="text-[#6b7280]">No chart data sync available</p></div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                                            <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                                            <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                                            <Tooltip 
                                                contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "8px" }}
                                                itemStyle={{ fontSize: 13, fontWeight: "bold" }}
                                            />
                                            <Legend wrapperStyle={{ fontSize: 12, paddingTop: "10px" }} />
                                            <Line type="monotone" name="Pool Users" dataKey="pool" stroke="#3b82f6" strokeWidth={3} dot={{ stroke: "#1d4ed8", strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
                                            <Line type="monotone" name="Hostel Users" dataKey="hostel" stroke="#10b981" strokeWidth={3} dot={{ stroke: "#047857", strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
                                            <Line type="monotone" name="Business Users" dataKey="business" stroke="#8b5cf6" strokeWidth={3} dot={{ stroke: "#6d28d9", strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
                                            <Line type="monotone" name="System Active Users" dataKey="active" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="bg-[#0b1220] border border-[#1f2937] rounded-2xl p-6 shadow-sm">
                            <h3 className="text-base font-semibold text-white mb-5 flex items-center gap-2">
                                <Zap className="w-4 h-4 text-amber-400" /> Quick Actions
                            </h3>
                            <div className="space-y-2.5">
                                <QuickAction icon={<Plus className="w-4 h-4" />} label="Create Referral Code" href="/superadmin/referrals" variant="primary" />
                                <QuickAction icon={<Gift className="w-4 h-4" />} label="Give Free Trial" href="/subscribe" variant="default" />
                                <QuickAction icon={<CreditCard className="w-4 h-4" />} label="Activate Subscription" href="/superadmin/billing" variant="default" />
                                <QuickAction icon={<Droplets className="w-4 h-4" />} label="Onboard New Pool" href="/subscribe" variant="default" />
                                <QuickAction icon={<Building2 className="w-4 h-4" />} label="Register New Hostel" href="/hostel/register" variant="default" />
                                <div className="pt-2 border-t border-[#1f2937]">
                                    <QuickAction icon={<ShieldAlert className="w-4 h-4" />} label="Suspend Organization" href="/superadmin/pools" variant="danger" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── TAB: Organizations ── */}
            {activeTab === "orgs" && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-white">Organization Health Monitor</h2>
                        <div className="flex items-center gap-3 text-xs font-semibold">
                            <span className="flex items-center gap-1.5 text-emerald-400"><span className="w-2 h-2 bg-emerald-400 rounded-full" /> Healthy</span>
                            <span className="flex items-center gap-1.5 text-amber-400"><span className="w-2 h-2 bg-amber-400 rounded-full" /> At Risk</span>
                            <span className="flex items-center gap-1.5 text-red-400"><span className="w-2 h-2 bg-red-400 rounded-full" /> Critical</span>
                        </div>
                    </div>

                    <div className="bg-[#0b1220] border border-[#1f2937] rounded-2xl shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-[#1f2937]">
                                        <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#9ca3af]">Organization</th>
                                        <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#9ca3af]">Plan</th>
                                        <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#9ca3af]">Status</th>
                                        <th className="text-right px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#9ca3af]">Revenue</th>
                                        <th className="text-center px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#9ca3af]">Referral</th>
                                        <th className="text-center px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#9ca3af]">Risk</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orgHealth.length === 0 ? (
                                        <tr><td colSpan={6} className="text-center py-12 text-[#6b7280]">No organizations registered yet.</td></tr>
                                    ) : (
                                        orgHealth.map((org: any) => (
                                            <tr key={org._id} className="border-b border-[#1f2937]/50 hover:bg-[#8b5cf6]/5 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-[#1f2937] flex items-center justify-center text-xs font-bold text-blue-400">
                                                            {org.name?.charAt(0) || "?"}
                                                        </div>
                                                        <span className="font-semibold text-white">{org.name || "Unnamed"}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-[#9ca3af] font-medium">{org.plan}</td>
                                                <td className="px-6 py-4">
                                                    <StatusBadge status={org.status} />
                                                </td>
                                                <td className="px-6 py-4 text-right font-semibold text-white">₹{org.revenue.toLocaleString("en-IN")}</td>
                                                <td className="px-6 py-4 text-center">
                                                    {org.referralCodeUsed ? (
                                                        <span className="text-xs font-mono bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-1 rounded-md">{org.referralCodeUsed}</span>
                                                    ) : (
                                                        <span className="text-[#6b7280]">—</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <RiskDot risk={org.risk} />
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ── TAB: Referrals ── */}
            {activeTab === "referrals" && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                            <BadgePercent className="w-5 h-5 text-purple-400" /> Referral Intelligence
                        </h2>
                        <a href="/superadmin/referrals" className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium transition-colors">
                            Manage Codes <ArrowUpRight className="w-3.5 h-3.5" />
                        </a>
                    </div>

                    {/* Referral KPIs */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-[#0b1220] border border-[#1f2937] rounded-2xl p-5">
                            <p className="text-xs text-[#9ca3af] font-semibold uppercase tracking-wider">Best Performing</p>
                            <p className="text-2xl font-bold mt-2 bg-gradient-to-r from-emerald-400 to-green-300 bg-clip-text text-transparent">
                                {bestCode ? bestCode.code : "No Data"}
                            </p>
                            <p className="text-xs text-[#6b7280] mt-1">{bestCode ? `${bestCode.actualUses} uses · ₹${bestCode.revenueGenerated.toLocaleString("en-IN")} revenue` : ""}</p>
                        </div>
                        <div className="bg-[#0b1220] border border-[#1f2937] rounded-2xl p-5">
                            <p className="text-xs text-[#9ca3af] font-semibold uppercase tracking-wider">Dead Codes</p>
                            <p className="text-2xl font-bold mt-2 text-red-400">{referralIntel.filter(r => r.isDead).length}</p>
                            <p className="text-xs text-[#6b7280] mt-1">Active but zero conversions</p>
                        </div>
                        <div className="bg-[#0b1220] border border-[#1f2937] rounded-2xl p-5">
                            <p className="text-xs text-[#9ca3af] font-semibold uppercase tracking-wider">High ROI Codes</p>
                            <p className="text-2xl font-bold mt-2 text-emerald-400">{referralIntel.filter(r => r.isHighROI).length}</p>
                            <p className="text-xs text-[#6b7280] mt-1">Net profit positive</p>
                        </div>
                    </div>

                    {/* Referral Table */}
                    <div className="bg-[#0b1220] border border-[#1f2937] rounded-2xl shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-[#1f2937]">
                                        <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#9ca3af]">Code</th>
                                        <th className="text-center px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#9ca3af]">Uses</th>
                                        <th className="text-right px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#9ca3af]">Revenue</th>
                                        <th className="text-right px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#9ca3af]">Discount Loss</th>
                                        <th className="text-right px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#9ca3af]">Net Profit</th>
                                        <th className="text-center px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#9ca3af]">Status</th>
                                        <th className="text-center px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#9ca3af]">Signal</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {referralIntel.length === 0 ? (
                                        <tr><td colSpan={7} className="text-center py-12 text-[#6b7280]">No referral codes yet.</td></tr>
                                    ) : (
                                        referralIntel.map((r: any) => (
                                            <tr key={r._id} className="border-b border-[#1f2937]/50 hover:bg-[#8b5cf6]/5 transition-colors">
                                                <td className="px-6 py-4 font-bold font-mono tracking-wider text-white">{r.code}</td>
                                                <td className="px-6 py-4 text-center font-semibold text-blue-400">{r.actualUses}</td>
                                                <td className="px-6 py-4 text-right font-medium text-emerald-400">₹{r.revenueGenerated.toLocaleString("en-IN")}</td>
                                                <td className="px-6 py-4 text-right font-medium text-red-400">-₹{r.discountLoss.toLocaleString("en-IN")}</td>
                                                <td className={`px-6 py-4 text-right font-bold ${r.netProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                                    ₹{r.netProfit.toLocaleString("en-IN")}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <StatusBadge status={r.isActive ? "active" : "inactive"} />
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {r.isDead && <span className="text-xs font-bold text-red-400 bg-red-500/10 px-2 py-1 rounded-md border border-red-500/20">💀 Dead</span>}
                                                    {r.isHighROI && !r.isDead && <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">⚡ High ROI</span>}
                                                    {!r.isDead && !r.isHighROI && r.actualUses > 0 && <span className="text-xs text-[#6b7280]">Tracking</span>}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ── TAB: Billing ── */}
            {activeTab === "billing" && (
                <div className="space-y-6">
                    <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-emerald-400" /> Payment & Billing Control
                    </h2>

                    <div className="bg-[#0b1220] border border-[#1f2937] rounded-2xl shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-[#1f2937]">
                                        <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#9ca3af]">Date</th>
                                        <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#9ca3af]">Organization</th>
                                        <th className="text-right px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#9ca3af]">Amount</th>
                                        <th className="text-center px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#9ca3af]">Payment Mode</th>
                                        <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#9ca3af]">Period</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {billingLogs.length === 0 ? (
                                        <tr><td colSpan={5} className="text-center py-12 text-[#6b7280]">No billing records yet.</td></tr>
                                    ) : (
                                        billingLogs.map((b: any, i: number) => (
                                            <tr key={i} className="border-b border-[#1f2937]/50 hover:bg-[#8b5cf6]/5 transition-colors">
                                                <td className="px-6 py-4 text-[#9ca3af] font-medium">{new Date(b.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-[#1f2937] flex items-center justify-center text-[10px] font-bold text-blue-400">
                                                            {(orgNameMap[b.orgId?.toString()] || "?").charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="text-[#f9fafb] font-medium text-xs">{orgNameMap[b.orgId?.toString()] || "Unknown Org"}</p>
                                                            <p className="text-[#6b7280] font-mono text-[10px]">{b.orgId?.toString().slice(-8) || "—"}</p>
                                                        </div>
                                                    </div>
                                                </td>
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
                                                            : "bg-neutral-500/10 text-[#9ca3af] border-neutral-500/20"
                                                    }`}>
                                                        {b.paymentMode || b.method}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-[#9ca3af] text-xs">
                                                    {new Date(b.periodStart).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                                                    {" → "}
                                                    {new Date(b.periodEnd).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Sub-Components ────────────────────────────────────────────────────────────

function KpiCard({ title, value, icon, color, subtitle }: { title: string; value: string; icon: React.ReactNode; color: string; subtitle?: string }) {
    const colorMap: Record<string, string> = {
        emerald: "from-emerald-600/20 to-emerald-600/5 border-emerald-500/20 text-emerald-400",
        blue: "from-blue-600/20 to-blue-600/5 border-blue-500/20 text-blue-400",
        green: "from-green-600/20 to-green-600/5 border-green-500/20 text-green-400",
        amber: "from-amber-600/20 to-amber-600/5 border-amber-500/20 text-amber-400",
        red: "from-red-600/20 to-red-600/5 border-red-500/20 text-red-400",
    };
    const cls = colorMap[color] || colorMap.blue;

    return (
        <div className={`p-5 rounded-2xl bg-gradient-to-br ${cls} border backdrop-blur-sm flex flex-col gap-3 transition-all hover:scale-[1.02] hover:shadow-lg`}>
            <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#9ca3af]">{title}</span>
                <div className="opacity-60">{icon}</div>
            </div>
            <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
            {subtitle && <p className="text-[10px] font-semibold uppercase tracking-wider opacity-60">{subtitle}</p>}
        </div>
    );
}

function MiniStat({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
    return (
        <div className="flex items-center gap-4 p-4 rounded-xl bg-[#0b1220] border border-[#1f2937] hover:bg-[#8b5cf6]/5 transition-colors">
            <div className="p-2 rounded-lg bg-[#8b5cf6]/10 text-[#8b5cf6]">{icon}</div>
            <div>
                <p className="text-lg font-bold text-[#f9fafb]">{value}</p>
                <p className="text-xs text-[#6b7280] font-medium">{label}</p>
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const map: Record<string, string> = {
        active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        trial: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        expired: "bg-red-500/10 text-red-400 border-red-500/20",
        inactive: "bg-neutral-500/10 text-[#9ca3af] border-neutral-500/20",
    };
    return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold uppercase border ${map[status] || map.inactive}`}>
            {status}
        </span>
    );
}

function RiskDot({ risk }: { risk: string }) {
    const map: Record<string, string> = {
        green: "bg-emerald-400 shadow-emerald-400/40",
        yellow: "bg-amber-400 shadow-amber-400/40",
        red: "bg-red-400 shadow-red-400/40 animate-pulse",
    };
    return <span className={`inline-block w-3 h-3 rounded-full shadow-lg ${map[risk] || map.green}`} />;
}

function QuickAction({ icon, label, href, variant }: { icon: React.ReactNode; label: string; href: string; variant: "primary" | "default" | "danger" }) {
    const cls = variant === "primary"
        ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white border-0 shadow-lg shadow-blue-500/20"
        : variant === "danger"
        ? "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/100/20"
        : "bg-[#0b1220] text-[#9ca3af] border-[#1f2937] hover:bg-[#8b5cf6]/10 hover:text-[#f9fafb]";

    return (
        <a href={href} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold border transition-all ${cls}`}>
            {icon}
            {label}
        </a>
    );
}
