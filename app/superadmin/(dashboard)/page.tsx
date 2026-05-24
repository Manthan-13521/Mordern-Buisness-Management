"use client";

import { useEffect, useState } from "react";
import {
    DollarSign, TrendingUp, Users, AlertTriangle, Clock,
    Activity, Building2, Droplets, CreditCard,
    RefreshCw, CheckCircle2, ArrowUpRight,
    BadgePercent, Target, Bell
} from "lucide-react";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { SACard } from "@/components/superadmin/ui/SACard";
import { SAKpiCard } from "@/components/superadmin/ui/SAKpiCard";
import { SABadge } from "@/components/superadmin/ui/SABadge";
import { SATable, SATableContainer, SATHead, SATH, SATBody, SATR, SATD } from "@/components/superadmin/ui/SATable";
import { SAPageHeader } from "@/components/superadmin/ui/SAPageHeader";
import { SAButton } from "@/components/superadmin/ui/SAButton";
import { SAEmptyState } from "@/components/superadmin/ui/SAEmptyState";

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
        totalBusinesses: number;
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
        const interval = setInterval(fetchDashboard, 30000);
        return () => clearInterval(interval);
    }, []);

    if (loading && !data) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-[var(--sa-accent-muted)] border-t-[var(--sa-accent)] rounded-full animate-spin" />
                    <p className="text-[var(--sa-text-muted)] text-sm font-medium animate-pulse">Loading Command Center...</p>
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <SAEmptyState 
                title="Failed to Load Data" 
                description="The dashboard data could not be loaded. Please check your connection." 
                icon={<AlertTriangle className="w-6 h-6" />}
            />
        );
    }

    const { kpis, orgHealth, referralIntel, billingLogs, alerts } = data;
    const bestCode = referralIntel.length > 0 ? referralIntel[0] : null;

    const orgNameMap: Record<string, string> = {};
    orgHealth.forEach((o: any) => { if (o._id) orgNameMap[o._id.toString()] = o.name; });

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* ── Header ── */}
            <SAPageHeader 
                title="SaaS Command Center"
                description="Revenue · Organizations · Growth · Risk — everything in 5 seconds."
                actions={
                    <SAButton onClick={fetchDashboard} disabled={loading} variant="secondary">
                        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                    </SAButton>
                }
            />

            {/* ── Alert Banner ── */}
            {alerts.length > 0 && (
                <div className="space-y-2">
                    {alerts.map((a, i) => {
                        const isDanger = a.type === "danger";
                        const isWarning = a.type === "warning";
                        return (
                            <div key={i} className={`flex items-center gap-3 px-5 py-3.5 rounded-xl border text-sm font-medium ${
                                isDanger
                                    ? "bg-[var(--sa-danger-muted)] border-[var(--sa-danger-muted)] text-[var(--sa-danger)]"
                                    : isWarning
                                    ? "bg-[var(--sa-warning-muted)] border-[var(--sa-warning-muted)] text-[var(--sa-warning)]"
                                    : "bg-[var(--sa-info-muted)] border-[var(--sa-info-muted)] text-[var(--sa-info)]"
                            }`}>
                                <Bell className="w-4 h-4 shrink-0" />
                                {a.message}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Tabs ── */}
            <div className="flex overflow-x-auto gap-1 bg-[var(--sa-bg-elevated)] p-1.5 rounded-xl border border-[var(--sa-border)] w-fit">
                {(["overview", "orgs", "referrals", "billing"] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-5 py-2 whitespace-nowrap rounded-lg text-sm font-semibold capitalize transition-all ${
                            activeTab === tab
                                ? "bg-[var(--sa-bg-card)] text-[var(--sa-text-primary)] shadow-sm border border-[var(--sa-border)]"
                                : "text-[var(--sa-text-muted)] hover:text-[var(--sa-text-primary)] hover:bg-[var(--sa-bg-card-hover)] border border-transparent"
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
                        <p className="text-xs font-bold uppercase tracking-widest text-[var(--sa-success)] mb-4 flex items-center gap-2"><DollarSign className="w-3.5 h-3.5" /> Revenue Intelligence</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                            <SAKpiCard title="Total SaaS Revenue" value={`₹${kpis.totalRevenue.toLocaleString("en-IN")}`} icon={<DollarSign className="w-5 h-5" />} color="emerald" />
                            <SAKpiCard title="MRR (30 days)" value={`₹${kpis.mrr.toLocaleString("en-IN")}`} icon={<TrendingUp className="w-5 h-5" />} color="blue" />
                            <SAKpiCard title="Active Organizations" value={kpis.activeOrgs.toString()} icon={<CheckCircle2 className="w-5 h-5" />} color="green" />
                            <SAKpiCard title="Trial Users" value={kpis.trialOrgs.toString()} icon={<Clock className="w-5 h-5" />} color="amber" subtitle="Conversion target" />
                            <SAKpiCard title="Expiring Soon" value={kpis.expiringSoon.toString()} icon={<AlertTriangle className="w-5 h-5" />} color="red" subtitle="Churn risk" />
                        </div>
                    </div>

                    {/* Row 2: Platform Stats */}
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-[var(--sa-info)] mb-4 flex items-center gap-2"><Activity className="w-3.5 h-3.5" /> Platform Health</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                            <SACard padding="sm" className="flex items-center gap-4 hover:bg-[var(--sa-bg-card-hover)] transition-colors cursor-pointer">
                                <div className="p-2 rounded-lg bg-[var(--sa-info-muted)] text-[var(--sa-info)]"><Droplets className="w-4 h-4" /></div>
                                <div><p className="text-lg font-bold text-[var(--sa-text-primary)]">{kpis.totalPools}</p><p className="text-xs text-[var(--sa-text-muted)] font-medium">Pools</p></div>
                            </SACard>
                            <SACard padding="sm" className="flex items-center gap-4 hover:bg-[var(--sa-bg-card-hover)] transition-colors cursor-pointer">
                                <div className="p-2 rounded-lg bg-[var(--sa-accent-muted)] text-[var(--sa-accent)]"><Building2 className="w-4 h-4" /></div>
                                <div><p className="text-lg font-bold text-[var(--sa-text-primary)]">{kpis.totalHostels}</p><p className="text-xs text-[var(--sa-text-muted)] font-medium">Hostels</p></div>
                            </SACard>
                            <SACard padding="sm" className="flex items-center gap-4 hover:bg-[var(--sa-bg-card-hover)] transition-colors cursor-pointer">
                                <div className="p-2 rounded-lg bg-[var(--sa-warning-muted)] text-[var(--sa-warning)]"><Activity className="w-4 h-4" /></div>
                                <div><p className="text-lg font-bold text-[var(--sa-text-primary)]">{kpis.totalBusinesses}</p><p className="text-xs text-[var(--sa-text-muted)] font-medium">Businesses</p></div>
                            </SACard>
                            <SACard padding="sm" className="flex items-center gap-4 hover:bg-[var(--sa-bg-card-hover)] transition-colors cursor-pointer">
                                <div className="p-2 rounded-lg bg-[var(--sa-success-muted)] text-[var(--sa-success)]"><Users className="w-4 h-4" /></div>
                                <div><p className="text-lg font-bold text-[var(--sa-text-primary)]">{kpis.totalMembers}</p><p className="text-xs text-[var(--sa-text-muted)] font-medium">Total Members</p></div>
                            </SACard>
                            <SACard padding="sm" className="flex items-center gap-4 hover:bg-[var(--sa-bg-card-hover)] transition-colors cursor-pointer">
                                <div className="p-2 rounded-lg bg-[var(--sa-accent-muted)] text-[var(--sa-accent)]"><Target className="w-4 h-4" /></div>
                                <div><p className="text-lg font-bold text-[var(--sa-text-primary)]">{kpis.conversionRate}%</p><p className="text-xs text-[var(--sa-text-muted)] font-medium">Conversion Rate</p></div>
                            </SACard>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Revenue Chart */}
                        <SACard className="lg:col-span-2">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-lg font-bold text-[var(--sa-text-primary)]">Revenue Growth</h3>
                                    <p className="text-sm text-[var(--sa-text-muted)] mt-1">Last 6 months MRR trajectory</p>
                                </div>
                                <select className="bg-[var(--sa-bg-input)] border border-[var(--sa-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--sa-text-primary)] outline-none focus:border-[var(--sa-accent)]">
                                    <option>6 Months</option>
                                    <option>12 Months</option>
                                </select>
                            </div>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--sa-border)" vertical={false} />
                                        <XAxis dataKey="month" stroke="var(--sa-text-muted)" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                                        <YAxis stroke="var(--sa-text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val/1000}k`} dx={-10} />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: 'var(--sa-bg-elevated)', border: '1px solid var(--sa-border)', borderRadius: '12px', color: 'var(--sa-text-primary)', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                            itemStyle={{ color: 'var(--sa-text-primary)' }}
                                        />
                                        <Line type="monotone" dataKey="revenue" stroke="var(--sa-accent)" strokeWidth={3} dot={{ r: 4, fill: 'var(--sa-bg-card)', strokeWidth: 2, stroke: 'var(--sa-accent)' }} activeDot={{ r: 6, fill: 'var(--sa-accent)' }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </SACard>

                        {/* Recent Activity / Tasks */}
                        <SACard className="flex flex-col">
                            <h3 className="text-lg font-bold text-[var(--sa-text-primary)] mb-6">Attention Needed</h3>
                            
                            <div className="flex-1 space-y-4">
                                {/* Risk Items */}
                                {orgHealth.filter(o => o.status === "suspended").slice(0, 2).map((o, i) => (
                                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl hover:bg-[var(--sa-bg-card-hover)] transition-colors border border-transparent hover:border-[var(--sa-border-subtle)] group cursor-pointer">
                                        <div className="mt-1 w-2 h-2 rounded-full bg-[var(--sa-danger)] shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse shrink-0" />
                                        <div>
                                            <p className="text-sm font-semibold text-[var(--sa-text-primary)] group-hover:text-[var(--sa-danger)] transition-colors">{o.name}</p>
                                            <p className="text-xs text-[var(--sa-text-muted)] mt-1">Suspended • Payment Overdue</p>
                                        </div>
                                    </div>
                                ))}

                                {/* Actions */}
                                <div className="pt-4 border-t border-[var(--sa-border-subtle)] space-y-2">
                                    <p className="text-[10px] font-bold text-[var(--sa-text-disabled)] uppercase tracking-wider mb-3">Quick Actions</p>
                                    <SAButton variant="secondary" className="w-full justify-start" onClick={() => setActiveTab("orgs")}>
                                        <Building2 className="w-4 h-4 text-[var(--sa-info)]" />
                                        Review Organizations
                                    </SAButton>
                                    <SAButton variant="secondary" className="w-full justify-start" onClick={() => setActiveTab("billing")}>
                                        <CreditCard className="w-4 h-4 text-[var(--sa-accent)]" />
                                        Process Payouts
                                    </SAButton>
                                    <SAButton variant="secondary" className="w-full justify-start" onClick={() => setActiveTab("referrals")}>
                                        <TrendingUp className="w-4 h-4 text-[var(--sa-success)]" />
                                        Audit Referrals
                                    </SAButton>
                                </div>
                            </div>
                        </SACard>
                    </div>
                </div>
            )}

            {/* ── TAB: Organizations ── */}
            {activeTab === "orgs" && (
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <h2 className="text-xl font-semibold text-[var(--sa-text-primary)]">Organization Health Monitor</h2>
                        <div className="flex items-center gap-3 text-xs font-semibold text-[var(--sa-text-secondary)]">
                            <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-[var(--sa-success)] rounded-full" /> Healthy</span>
                            <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-[var(--sa-warning)] rounded-full" /> At Risk</span>
                            <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-[var(--sa-danger)] rounded-full animate-pulse" /> Critical</span>
                        </div>
                    </div>

                    <SATableContainer>
                        <SATable>
                            <SATHead>
                                <SATR>
                                    <SATH>Organization</SATH>
                                    <SATH>Plan</SATH>
                                    <SATH>Status</SATH>
                                    <SATH className="text-right">Revenue</SATH>
                                    <SATH className="text-center">Referral</SATH>
                                    <SATH className="text-center">Risk</SATH>
                                </SATR>
                            </SATHead>
                            <SATBody>
                                {orgHealth.length === 0 ? (
                                    <SATR><SATD colSpan={6} className="text-center py-12 text-[var(--sa-text-muted)]">No organizations registered yet.</SATD></SATR>
                                ) : (
                                    orgHealth.map((org: any) => (
                                        <SATR key={org._id}>
                                            <SATD>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-lg bg-[var(--sa-bg-elevated)] border border-[var(--sa-border)] flex items-center justify-center text-xs font-bold text-[var(--sa-text-primary)]">
                                                        {org.name?.charAt(0) || "?"}
                                                    </div>
                                                    <span className="font-semibold text-[var(--sa-text-primary)]">{org.name || "Unnamed"}</span>
                                                </div>
                                            </SATD>
                                            <SATD className="text-[var(--sa-text-secondary)] font-medium">{org.plan}</SATD>
                                            <SATD>
                                                <SABadge variant={org.status === "active" ? "success" : org.status === "trial" ? "warning" : org.status === "expired" ? "danger" : "neutral"}>
                                                    {org.status}
                                                </SABadge>
                                            </SATD>
                                            <SATD className="text-right font-semibold text-[var(--sa-text-primary)]">₹{org.revenue.toLocaleString("en-IN")}</SATD>
                                            <SATD className="text-center">
                                                {org.referralCodeUsed ? (
                                                    <SABadge variant="accent">{org.referralCodeUsed}</SABadge>
                                                ) : (
                                                    <span className="text-[var(--sa-text-disabled)]">—</span>
                                                )}
                                            </SATD>
                                            <SATD className="text-center flex justify-center">
                                                <span className={`inline-block w-3 h-3 rounded-full ${
                                                    org.risk === "green" ? "bg-[var(--sa-success)] shadow-[0_0_8px_rgba(16,185,129,0.4)]" :
                                                    org.risk === "yellow" ? "bg-[var(--sa-warning)] shadow-[0_0_8px_rgba(245,158,11,0.4)]" :
                                                    "bg-[var(--sa-danger)] shadow-[0_0_8px_rgba(239,68,68,0.4)] animate-pulse"
                                                }`} />
                                            </SATD>
                                        </SATR>
                                    ))
                                )}
                            </SATBody>
                        </SATable>
                    </SATableContainer>
                </div>
            )}

            {/* ── TAB: Referrals ── */}
            {activeTab === "referrals" && (
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <h2 className="text-xl font-semibold text-[var(--sa-text-primary)] flex items-center gap-2">
                            <BadgePercent className="w-5 h-5 text-[var(--sa-accent)]" /> Referral Intelligence
                        </h2>
                        <a href="/superadmin/referrals" className="text-sm text-[var(--sa-info)] hover:text-[var(--sa-info-muted)] flex items-center gap-1 font-medium transition-colors">
                            Manage Codes <ArrowUpRight className="w-3.5 h-3.5" />
                        </a>
                    </div>

                    {/* Referral KPIs */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <SACard>
                            <p className="text-xs text-[var(--sa-text-muted)] font-semibold uppercase tracking-wider">Best Performing</p>
                            <p className="text-2xl font-bold mt-2 text-[var(--sa-success)]">
                                {bestCode ? bestCode.code : "No Data"}
                            </p>
                            <p className="text-xs text-[var(--sa-text-disabled)] mt-1">{bestCode ? `${bestCode.actualUses} uses · ₹${bestCode.revenueGenerated.toLocaleString("en-IN")} revenue` : ""}</p>
                        </SACard>
                        <SACard>
                            <p className="text-xs text-[var(--sa-text-muted)] font-semibold uppercase tracking-wider">Dead Codes</p>
                            <p className="text-2xl font-bold mt-2 text-[var(--sa-danger)]">{referralIntel.filter(r => r.isDead).length}</p>
                            <p className="text-xs text-[var(--sa-text-disabled)] mt-1">Active but zero conversions</p>
                        </SACard>
                        <SACard>
                            <p className="text-xs text-[var(--sa-text-muted)] font-semibold uppercase tracking-wider">High ROI Codes</p>
                            <p className="text-2xl font-bold mt-2 text-[var(--sa-success)]">{referralIntel.filter(r => r.isHighROI).length}</p>
                            <p className="text-xs text-[var(--sa-text-disabled)] mt-1">Net profit positive</p>
                        </SACard>
                    </div>

                    {/* Referral Table */}
                    <SATableContainer>
                        <SATable>
                            <SATHead>
                                <SATR>
                                    <SATH>Code</SATH>
                                    <SATH className="text-center">Uses</SATH>
                                    <SATH className="text-right">Revenue</SATH>
                                    <SATH className="text-right">Discount Loss</SATH>
                                    <SATH className="text-right">Net Profit</SATH>
                                    <SATH className="text-center">Status</SATH>
                                    <SATH className="text-center">Signal</SATH>
                                </SATR>
                            </SATHead>
                            <SATBody>
                                {referralIntel.length === 0 ? (
                                    <SATR><SATD colSpan={7} className="text-center py-12 text-[var(--sa-text-muted)]">No referral codes yet.</SATD></SATR>
                                ) : (
                                    referralIntel.map((r: any) => (
                                        <SATR key={r._id}>
                                            <SATD className="font-bold font-mono tracking-wider">{r.code}</SATD>
                                            <SATD className="text-center font-semibold text-[var(--sa-info)]">{r.actualUses}</SATD>
                                            <SATD className="text-right font-medium text-[var(--sa-success)]">₹{r.revenueGenerated.toLocaleString("en-IN")}</SATD>
                                            <SATD className="text-right font-medium text-[var(--sa-danger)]">-₹{r.discountLoss.toLocaleString("en-IN")}</SATD>
                                            <SATD className={`text-right font-bold ${r.netProfit >= 0 ? "text-[var(--sa-success)]" : "text-[var(--sa-danger)]"}`}>
                                                ₹{r.netProfit.toLocaleString("en-IN")}
                                            </SATD>
                                            <SATD className="text-center">
                                                <SABadge variant={r.isActive ? "success" : "neutral"}>{r.isActive ? "active" : "inactive"}</SABadge>
                                            </SATD>
                                            <SATD className="text-center">
                                                {r.isDead && <SABadge variant="danger">💀 Dead</SABadge>}
                                                {r.isHighROI && !r.isDead && <SABadge variant="success">⚡ High ROI</SABadge>}
                                                {!r.isDead && !r.isHighROI && r.actualUses > 0 && <span className="text-xs text-[var(--sa-text-disabled)]">Tracking</span>}
                                            </SATD>
                                        </SATR>
                                    ))
                                )}
                            </SATBody>
                        </SATable>
                    </SATableContainer>
                </div>
            )}

            {/* ── TAB: Billing ── */}
            {activeTab === "billing" && (
                <div className="space-y-6">
                    <h2 className="text-xl font-semibold text-[var(--sa-text-primary)] flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-[var(--sa-success)]" /> Payment & Billing Control
                    </h2>

                    <SATableContainer>
                        <SATable>
                            <SATHead>
                                <SATR>
                                    <SATH>Date</SATH>
                                    <SATH>Organization</SATH>
                                    <SATH className="text-right">Amount</SATH>
                                    <SATH className="text-center">Payment Mode</SATH>
                                    <SATH>Period</SATH>
                                </SATR>
                            </SATHead>
                            <SATBody>
                                {billingLogs.length === 0 ? (
                                    <SATR><SATD colSpan={5} className="text-center py-12 text-[var(--sa-text-muted)]">No billing records yet.</SATD></SATR>
                                ) : (
                                    billingLogs.map((b: any, i: number) => (
                                        <SATR key={i}>
                                            <SATD className="text-[var(--sa-text-secondary)] font-medium">{new Date(b.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</SATD>
                                            <SATD>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-[var(--sa-bg-elevated)] border border-[var(--sa-border)] flex items-center justify-center text-xs font-bold text-[var(--sa-text-primary)]">
                                                        {(orgNameMap[b.orgId?.toString()] || "?").charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-[var(--sa-text-primary)] font-semibold text-sm">{orgNameMap[b.orgId?.toString()] || "Unknown Org"}</p>
                                                        <p className="text-[var(--sa-text-muted)] font-mono text-[10px]">{b.orgId?.toString().slice(-8) || "—"}</p>
                                                    </div>
                                                </div>
                                            </SATD>
                                            <SATD className="text-right font-bold text-[var(--sa-success)]">₹{b.amount?.toLocaleString("en-IN")}</SATD>
                                            <SATD className="text-center">
                                                <SABadge variant={b.method === "cash" ? "success" : b.method === "upi" ? "accent" : "info"}>
                                                    {b.paymentMode || b.method}
                                                </SABadge>
                                            </SATD>
                                            <SATD className="text-[var(--sa-text-secondary)] text-xs">
                                                {new Date(b.periodStart).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                                                {" → "}
                                                {new Date(b.periodEnd).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })}
                                            </SATD>
                                        </SATR>
                                    ))
                                )}
                            </SATBody>
                        </SATable>
                    </SATableContainer>
                </div>
            )}
        </div>
    );
}
