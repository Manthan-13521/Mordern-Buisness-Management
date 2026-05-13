"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import {
    Loader2, TrendingUp, DollarSign, ShieldAlert, AlertTriangle,
    BarChart3, CreditCard, PieChartIcon, Users
} from "lucide-react";

interface Summary {
    todayRevenue: number;
    monthlyRevenue: number;
    totalDue: number;
    totalPaid: number;
    outstandingDues: number;
    defaulterCount: number;
    recoveryRate: number;
    creditBalance: number;
}

interface TrendPoint { date: string; revenue: number; count: number; }
interface DefaulterData { buckets: { active: number; warning: number; blocked: number }; members: any[]; }
interface PlanRevenue { planName: string; revenue: number; count: number; }

const BUCKET_COLORS = { active: "#22c55e", warning: "#f59e0b", blocked: "#ef4444" };

export default function RevenueAnalyticsPage() {
    const { data: session } = useSession();
    const [summary, setSummary] = useState<Summary | null>(null);
    const [trends, setTrends] = useState<TrendPoint[]>([]);
    const [defaulters, setDefaulters] = useState<DefaulterData | null>(null);
    const [planRevenue, setPlanRevenue] = useState<PlanRevenue[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!session) return;
        setLoading(true);

        Promise.all([
            fetch("/api/analytics/summary", { cache: 'no-store' }).then(r => r.json()),
            fetch("/api/analytics/trends", { cache: 'no-store' }).then(r => r.json()),
            fetch("/api/analytics/defaulters", { cache: 'no-store' }).then(r => r.json()),
            fetch("/api/analytics/plan-revenue", { cache: 'no-store' }).then(r => r.json()),
        ]).then(([s, t, d, p]) => {
            setSummary(s);
            setTrends(t);
            setDefaulters(d);
            setPlanRevenue(p);
        }).catch(console.error).finally(() => setLoading(false));
    }, [session]);

    if (loading || !summary) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
        );
    }

    const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

    const kpiCards = [
        { label: "Today's Revenue", value: fmt(summary.todayRevenue), icon: DollarSign, color: "text-emerald-400", bg: "from-emerald-500/20 to-emerald-600/5" },
        { label: "Monthly Revenue", value: fmt(summary.monthlyRevenue), icon: TrendingUp, color: "text-blue-400", bg: "from-blue-500/20 to-blue-600/5" },
        { label: "Outstanding Dues", value: fmt(summary.outstandingDues), icon: AlertTriangle, color: "text-rose-400", bg: "from-red-500/20 to-red-600/5" },
        { label: "Defaulters", value: summary.defaulterCount, icon: ShieldAlert, color: "text-amber-400", bg: "from-amber-500/20 to-amber-600/5" },
        { label: "Recovery Rate", value: `${summary.recoveryRate}%`, icon: BarChart3, color: summary.recoveryRate >= 80 ? "text-emerald-400" : "text-yellow-400", bg: summary.recoveryRate >= 80 ? "from-emerald-500/20 to-emerald-600/5" : "from-yellow-500/20 to-yellow-600/5" },
        { label: "Credit Balance", value: fmt(summary.creditBalance), icon: CreditCard, color: "text-cyan-400", bg: "from-cyan-500/20 to-cyan-600/5" },
    ];

    const pieData = defaulters ? [
        { name: "Active (0-5d)", value: defaulters.buckets.active, color: BUCKET_COLORS.active },
        { name: "Warning (5-15d)", value: defaulters.buckets.warning, color: BUCKET_COLORS.warning },
        { name: "Blocked (15+d)", value: defaulters.buckets.blocked, color: BUCKET_COLORS.blocked },
    ].filter(d => d.value > 0) : [];

    const statusBadge: Record<string, string> = {
        active: "bg-green-500/10 text-green-400 border-green-500/30",
        warning: "bg-amber-500/10 text-amber-400 border-amber-500/30",
        blocked: "bg-rose-500/10 text-rose-400 border-rose-500/30 font-bold",
    };

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in zoom-in duration-500">
            <div>
                <h1 className="text-2xl font-bold text-gray-100 sm:text-3xl tracking-tight">Revenue & Analytics</h1>
                <p className="text-sm text-[#6b7280] mt-1">Actionable business intelligence from your Ledger system</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {kpiCards.map(k => (
                    <div key={k.label} className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${k.bg} border border-[#1f2937] p-5 group hover:border-white/20 transition-all`}>
                        <div className="flex items-center gap-2 mb-2">
                            <k.icon className={`w-4 h-4 ${k.color}`} />
                            <span className="text-[10px] uppercase tracking-wider text-[#6b7280] font-medium">{k.label}</span>
                        </div>
                        <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* 30-Day Revenue Trend */}
                <div className="bg-gray-900 p-6 rounded-2xl shadow-xl border border-gray-800 flex flex-col">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-blue-500/10 rounded-xl">
                            <TrendingUp className="w-5 h-5 text-blue-400" />
                        </div>
                        <h2 className="text-lg font-semibold text-gray-100">30-Day Revenue Trend</h2>
                    </div>
                    <div className="w-full min-h-[300px] flex items-center justify-center bg-gray-950/20 rounded-xl border border-gray-800/50">
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={trends} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                                <XAxis
                                    dataKey="date"
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fill: '#9CA3AF', fontSize: 10 }}
                                    dy={10}
                                    tickFormatter={(v) => v.slice(5)}
                                />
                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fill: '#9CA3AF', fontSize: 10 }}
                                    tickFormatter={(v) => `₹${v}`}
                                    width={60}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8 }}
                                    labelStyle={{ color: '#9CA3AF' }}
                                    formatter={(value: any) => [fmt(Number(value)), "Revenue"]}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#3B82F6"
                                    strokeWidth={2}
                                    dot={{ fill: '#3B82F6', r: 3 }}
                                    activeDot={{ r: 6, fill: '#60A5FA' }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Defaulter Buckets */}
                <div className="bg-gray-900 p-6 rounded-2xl shadow-xl border border-gray-800 flex flex-col">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-rose-500/10 rounded-xl">
                            <ShieldAlert className="w-5 h-5 text-rose-400" />
                        </div>
                        <h2 className="text-lg font-semibold text-gray-100">Defaulter Distribution</h2>
                    </div>
                    <div className="w-full min-h-[300px] flex items-center justify-center bg-gray-950/20 rounded-xl border border-gray-800/50">
                        {pieData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={4}
                                        dataKey="value"
                                        label={({ name, value }) => `${name}: ${value}`}
                                    >
                                        {pieData.map((entry, i) => (
                                            <Cell key={i} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8 }} />
                                    <Legend wrapperStyle={{ color: '#9CA3AF', fontSize: 12 }} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <p className="text-[#6b7280] text-sm font-medium">No defaulters found. 🎉</p>
                        )}
                    </div>
                </div>

                {/* Plan Revenue Breakdown */}
                <div className="bg-gray-900 p-6 rounded-2xl shadow-xl border border-gray-800 flex flex-col">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-purple-500/10 rounded-xl">
                            <BarChart3 className="w-5 h-5 text-purple-400" />
                        </div>
                        <h2 className="text-lg font-semibold text-gray-100">Plan-wise Revenue</h2>
                    </div>
                    <div className="w-full min-h-[300px] flex items-center justify-center bg-gray-950/20 rounded-xl border border-gray-800/50">
                        {planRevenue.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={planRevenue} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#374151" />
                                    <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: '#9CA3AF', fontSize: 10 }} tickFormatter={(v) => `₹${v}`} />
                                    <YAxis type="category" dataKey="planName" tickLine={false} axisLine={false} tick={{ fill: '#9CA3AF', fontSize: 11 }} width={120} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8 }}
                                        formatter={(value: any) => [fmt(Number(value)), "Revenue"]}
                                    />
                                    <Bar dataKey="revenue" fill="#8B5CF6" radius={[0, 6, 6, 0]} maxBarSize={30} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <p className="text-[#6b7280] text-sm font-medium">No plan revenue data yet.</p>
                        )}
                    </div>
                </div>

                {/* Top Defaulters Table */}
                <div className="bg-gray-900 p-6 rounded-2xl shadow-xl border border-gray-800 flex flex-col">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-rose-500/10 rounded-xl">
                            <Users className="w-5 h-5 text-rose-400" />
                        </div>
                        <h2 className="text-lg font-semibold text-gray-100">Top Defaulters</h2>
                    </div>
                    <div className="overflow-auto max-h-[300px]">
                        {defaulters && defaulters.members.length > 0 ? (
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 bg-gray-900">
                                    <tr className="text-left text-[#6b7280] text-xs uppercase">
                                        <th className="pb-3 pr-4">Member</th>
                                        <th className="pb-3 pr-4 text-right">Balance</th>
                                        <th className="pb-3 pr-4 text-right">Overdue</th>
                                        <th className="pb-3 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {defaulters.members.slice(0, 15).map((m: any, i: number) => (
                                        <tr key={i} className="border-t border-[#1f2937] hover:bg-[#0b1220] transition-colors">
                                            <td className="py-3 pr-4">
                                                <div className="font-medium text-white">{m.name}</div>
                                                <div className="text-[10px] text-[#6b7280] font-mono">#{m.memberId}</div>
                                            </td>
                                            <td className="py-3 pr-4 text-right font-bold text-rose-400">{fmt(m.balance)}</td>
                                            <td className="py-3 pr-4 text-right text-[#6b7280]">{m.overdueDays}d</td>
                                            <td className="py-3 text-center">
                                                <span className={`text-[10px] px-2 py-1 rounded-full border ${statusBadge[m.status]}`}>
                                                    {m.status.toUpperCase()}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p className="text-[#6b7280] text-sm font-medium text-center py-8">No defaulters found. 🎉</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
