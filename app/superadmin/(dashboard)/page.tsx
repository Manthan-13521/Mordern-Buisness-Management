"use client";

import { useEffect, useState } from "react";
import {
    DollarSign, TrendingUp, Users, AlertTriangle, Clock, Gift,
    Activity, Building2, Droplets, Plus, ShieldAlert, CreditCard,
    RefreshCw, Zap, XCircle, CheckCircle2, ArrowUpRight, BarChart3,
    BadgePercent, Target, Flame, Bell
} from "lucide-react";

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
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"overview" | "orgs" | "referrals" | "billing">("overview");

    const fetchDashboard = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/superadmin/dashboard");
            if (res.ok) setData(await res.json());
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchDashboard(); }, []);

    if (loading && !data) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                    <p className="text-neutral-400 text-sm font-medium animate-pulse">Loading Command Center...</p>
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

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* ── Header ── */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">SaaS Command Center</h1>
                    <p className="text-neutral-400 mt-1 text-sm">Revenue · Organizations · Growth · Risk — everything in 5 seconds.</p>
                </div>
                <button
                    onClick={fetchDashboard}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-neutral-300 hover:bg-white/10 hover:text-white transition-all text-sm font-medium disabled:opacity-50"
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
            <div className="flex gap-1 bg-white/5 p-1 rounded-xl border border-white/10 w-fit">
                {(["overview", "orgs", "referrals", "billing"] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-5 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${
                            activeTab === tab
                                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25"
                                : "text-neutral-400 hover:text-white hover:bg-white/5"
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <MiniStat label="Pools" value={kpis.totalPools} icon={<Droplets className="w-4 h-4" />} />
                            <MiniStat label="Hostels" value={kpis.totalHostels} icon={<Building2 className="w-4 h-4" />} />
                            <MiniStat label="Total Members" value={kpis.totalMembers} icon={<Users className="w-4 h-4" />} />
                            <MiniStat label="Conversion Rate" value={`${kpis.conversionRate}%`} icon={<Target className="w-4 h-4" />} />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Growth Chart */}
                        <div className="lg:col-span-2 bg-neutral-900/80 border border-white/5 rounded-2xl p-6 shadow-xl">
                            <h3 className="text-base font-semibold text-white mb-5 flex items-center gap-2">
                                <BarChart3 className="w-4 h-4 text-blue-400" /> Daily Signups (30d)
                            </h3>
                            {dailySignups.length === 0 ? (
                                <p className="text-neutral-500 text-sm text-center py-10">No signup data yet.</p>
                            ) : (
                                <div className="flex items-end gap-1 h-36">
                                    {dailySignups.map((d: any, i: number) => {
                                        const maxCount = Math.max(...dailySignups.map((x: any) => x.count), 1);
                                        const heightPct = (d.count / maxCount) * 100;
                                        return (
                                            <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                                                <div
                                                    className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-sm transition-all duration-300 hover:from-blue-500 hover:to-blue-300 min-h-[2px]"
                                                    style={{ height: `${heightPct}%` }}
                                                />
                                                <div className="absolute -top-8 bg-neutral-800 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                                    {d._id}: {d.count}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Quick Actions */}
                        <div className="bg-neutral-900/80 border border-white/5 rounded-2xl p-6 shadow-xl">
                            <h3 className="text-base font-semibold text-white mb-5 flex items-center gap-2">
                                <Zap className="w-4 h-4 text-amber-400" /> Quick Actions
                            </h3>
                            <div className="space-y-2.5">
                                <QuickAction icon={<Plus className="w-4 h-4" />} label="Create Referral Code" href="/superadmin/referrals" variant="primary" />
                                <QuickAction icon={<Gift className="w-4 h-4" />} label="Give Free Trial" href="/subscribe" variant="default" />
                                <QuickAction icon={<CreditCard className="w-4 h-4" />} label="Activate Subscription" href="/superadmin/billing" variant="default" />
                                <QuickAction icon={<Droplets className="w-4 h-4" />} label="Onboard New Pool" href="/subscribe" variant="default" />
                                <QuickAction icon={<Building2 className="w-4 h-4" />} label="Register New Hostel" href="/hostel/register" variant="default" />
                                <div className="pt-2 border-t border-white/5">
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

                    <div className="bg-neutral-900/80 border border-white/5 rounded-2xl shadow-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-white/5">
                                        <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-neutral-400">Organization</th>
                                        <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-neutral-400">Plan</th>
                                        <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-neutral-400">Status</th>
                                        <th className="text-right px-6 py-4 text-xs font-bold uppercase tracking-wider text-neutral-400">Revenue</th>
                                        <th className="text-center px-6 py-4 text-xs font-bold uppercase tracking-wider text-neutral-400">Referral</th>
                                        <th className="text-center px-6 py-4 text-xs font-bold uppercase tracking-wider text-neutral-400">Risk</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orgHealth.length === 0 ? (
                                        <tr><td colSpan={6} className="text-center py-12 text-neutral-500">No organizations registered yet.</td></tr>
                                    ) : (
                                        orgHealth.map((org: any) => (
                                            <tr key={org._id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-white/10 flex items-center justify-center text-xs font-bold text-blue-400">
                                                            {org.name?.charAt(0) || "?"}
                                                        </div>
                                                        <span className="font-semibold text-white">{org.name || "Unnamed"}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-neutral-300 font-medium">{org.plan}</td>
                                                <td className="px-6 py-4">
                                                    <StatusBadge status={org.status} />
                                                </td>
                                                <td className="px-6 py-4 text-right font-semibold text-white">₹{org.revenue.toLocaleString("en-IN")}</td>
                                                <td className="px-6 py-4 text-center">
                                                    {org.referralCodeUsed ? (
                                                        <span className="text-xs font-mono bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-1 rounded-md">{org.referralCodeUsed}</span>
                                                    ) : (
                                                        <span className="text-neutral-600">—</span>
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
                        <div className="bg-neutral-900/80 border border-white/5 rounded-2xl p-5">
                            <p className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">Best Performing</p>
                            <p className="text-2xl font-bold mt-2 bg-gradient-to-r from-emerald-400 to-green-300 bg-clip-text text-transparent">
                                {bestCode ? bestCode.code : "No Data"}
                            </p>
                            <p className="text-xs text-neutral-500 mt-1">{bestCode ? `${bestCode.actualUses} uses · ₹${bestCode.revenueGenerated.toLocaleString("en-IN")} revenue` : ""}</p>
                        </div>
                        <div className="bg-neutral-900/80 border border-white/5 rounded-2xl p-5">
                            <p className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">Dead Codes</p>
                            <p className="text-2xl font-bold mt-2 text-red-400">{referralIntel.filter(r => r.isDead).length}</p>
                            <p className="text-xs text-neutral-500 mt-1">Active but zero conversions</p>
                        </div>
                        <div className="bg-neutral-900/80 border border-white/5 rounded-2xl p-5">
                            <p className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">High ROI Codes</p>
                            <p className="text-2xl font-bold mt-2 text-emerald-400">{referralIntel.filter(r => r.isHighROI).length}</p>
                            <p className="text-xs text-neutral-500 mt-1">Net profit positive</p>
                        </div>
                    </div>

                    {/* Referral Table */}
                    <div className="bg-neutral-900/80 border border-white/5 rounded-2xl shadow-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-white/5">
                                        <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-neutral-400">Code</th>
                                        <th className="text-center px-6 py-4 text-xs font-bold uppercase tracking-wider text-neutral-400">Uses</th>
                                        <th className="text-right px-6 py-4 text-xs font-bold uppercase tracking-wider text-neutral-400">Revenue</th>
                                        <th className="text-right px-6 py-4 text-xs font-bold uppercase tracking-wider text-neutral-400">Discount Loss</th>
                                        <th className="text-right px-6 py-4 text-xs font-bold uppercase tracking-wider text-neutral-400">Net Profit</th>
                                        <th className="text-center px-6 py-4 text-xs font-bold uppercase tracking-wider text-neutral-400">Status</th>
                                        <th className="text-center px-6 py-4 text-xs font-bold uppercase tracking-wider text-neutral-400">Signal</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {referralIntel.length === 0 ? (
                                        <tr><td colSpan={7} className="text-center py-12 text-neutral-500">No referral codes yet.</td></tr>
                                    ) : (
                                        referralIntel.map((r: any) => (
                                            <tr key={r._id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
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
                                                    {!r.isDead && !r.isHighROI && r.actualUses > 0 && <span className="text-xs text-neutral-500">Tracking</span>}
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

                    <div className="bg-neutral-900/80 border border-white/5 rounded-2xl shadow-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-white/5">
                                        <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-neutral-400">Date</th>
                                        <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-neutral-400">Org ID</th>
                                        <th className="text-right px-6 py-4 text-xs font-bold uppercase tracking-wider text-neutral-400">Amount</th>
                                        <th className="text-center px-6 py-4 text-xs font-bold uppercase tracking-wider text-neutral-400">Method</th>
                                        <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider text-neutral-400">Period</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {billingLogs.length === 0 ? (
                                        <tr><td colSpan={5} className="text-center py-12 text-neutral-500">No billing records yet.</td></tr>
                                    ) : (
                                        billingLogs.map((b: any, i: number) => (
                                            <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                                                <td className="px-6 py-4 text-neutral-300 font-medium">{new Date(b.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
                                                <td className="px-6 py-4 text-neutral-400 font-mono text-xs">{b.orgId?.toString().slice(-8) || "—"}</td>
                                                <td className="px-6 py-4 text-right font-bold text-emerald-400">₹{b.amount?.toLocaleString("en-IN")}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`text-xs font-bold uppercase px-2.5 py-1 rounded-md border ${
                                                        b.method === "upi"
                                                            ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                                                            : b.method === "razorpay"
                                                            ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                                            : "bg-neutral-500/10 text-neutral-400 border-neutral-500/20"
                                                    }`}>
                                                        {b.method}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-neutral-400 text-xs">
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
                <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">{title}</span>
                <div className="opacity-60">{icon}</div>
            </div>
            <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
            {subtitle && <p className="text-[10px] font-semibold uppercase tracking-wider opacity-60">{subtitle}</p>}
        </div>
    );
}

function MiniStat({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
    return (
        <div className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] transition-colors">
            <div className="p-2 rounded-lg bg-white/5 text-blue-400">{icon}</div>
            <div>
                <p className="text-lg font-bold text-white">{value}</p>
                <p className="text-xs text-neutral-500 font-medium">{label}</p>
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const map: Record<string, string> = {
        active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        trial: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        expired: "bg-red-500/10 text-red-400 border-red-500/20",
        inactive: "bg-neutral-500/10 text-neutral-400 border-neutral-500/20",
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
        ? "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20"
        : "bg-white/5 text-neutral-300 border-white/10 hover:bg-white/10 hover:text-white";

    return (
        <a href={href} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold border transition-all ${cls}`}>
            {icon}
            {label}
        </a>
    );
}
