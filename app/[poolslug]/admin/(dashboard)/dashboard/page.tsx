"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Users, UserX, Activity, DollarSign, ArrowUpRight, TrendingUp, Waves, Heart } from "lucide-react";
import {
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function DashboardPage() {
    const { data: session } = useSession();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [occupancy, setOccupancy] = useState<{ current: number; capacity: number } | null>(null);
    const [health, setHealth] = useState<any>(null);

    useEffect(() => {
        fetch("/api/dashboard")
            .then((res) => res.json())
            .then((json) => { setData(json); setLoading(false); })
            .catch((err) => { console.error(err); setLoading(false); });

        fetch("/api/settings/capacity")
            .then(r => r.json())
            .then(d => setOccupancy({ current: d.currentOccupancy, capacity: d.poolCapacity }))
            .catch(() => {});

        if ((session?.user as any)?.role === "admin") {
            fetch("/api/admin/health")
                .then(r => r.json())
                .then(d => setHealth(d))
                .catch(() => {});
        }
    }, [session]);

    if (loading || !data) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="animate-pulse flex flex-col items-center">
                    <div className="h-12 w-12 bg-indigo-200 rounded-full mb-4"></div>
                    <div className="h-4 w-32 bg-gray-200 rounded"></div>
                </div>
            </div>
        );
    }

    const stats = [
        { name: "Total Members", stat: data.stats.totalMembers, icon: Users, color: "bg-blue-500" },
        { name: "Active Members", stat: data.stats.activeMembers, icon: Activity, color: "bg-green-500" },
        { name: "Expired Members", stat: data.stats.expiredMembers, icon: UserX, color: "bg-red-500" },
        { name: "Today's Entries", stat: data.stats.todaysEntries, icon: ArrowUpRight, color: "bg-indigo-500" },
    ];

    // Only Admin can see revenue
    if ((session?.user as any)?.role === "admin") {
        stats.push({ name: "Today's Revenue", stat: `₹${data.stats.todaysRevenue}`, icon: DollarSign, color: "bg-yellow-500" });
        stats.push({ name: "Monthly Revenue", stat: `₹${data.stats.monthlyRevenue}`, icon: TrendingUp, color: "bg-purple-500" });
    }

    const occupancyPercent = occupancy
        ? Math.min(100, Math.round((occupancy.current / occupancy.capacity) * 100))
        : 0;
    const occupancyColor = occupancyPercent >= 90 ? "text-red-600" : occupancyPercent >= 70 ? "text-yellow-600" : "text-green-600";

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard Overview</h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Welcome back, {session?.user?.name || "Admin"}. Here's what's happening today.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {stats.map((item) => (
                    <div
                        key={item.name}
                        className="relative overflow-hidden rounded-xl bg-white px-4 pb-12 pt-5 shadow sm:px-6 sm:pt-6 dark:bg-gray-900 border border-gray-100 dark:border-gray-800"
                    >
                        <dt>
                            <div className={`absolute rounded-md ${item.color} p-3`}>
                                <item.icon className="h-6 w-6 text-white" aria-hidden="true" />
                            </div>
                            <p className="ml-16 truncate text-sm font-medium text-gray-500 dark:text-gray-400">
                                {item.name}
                            </p>
                        </dt>
                        <dd className="ml-16 flex items-baseline pb-6 sm:pb-7">
                            <p className="text-2xl font-semibold text-gray-900 dark:text-white">{item.stat}</p>
                        </dd>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                {/* Payment Methods Chart */}
                <div className="rounded-xl bg-white shadow p-6 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Payment Methods</h2>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data.charts.paymentMethods}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                                >
                                    {data.charts.paymentMethods.map((_: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* System Health (admin only) */}
            {health && (session?.user as any)?.role === "admin" && (
                <div className="rounded-xl bg-white shadow p-6 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Heart className="w-5 h-5 text-rose-500" /> System Health
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                        <div className="flex flex-col">
                            <span className="text-gray-500 text-xs uppercase font-medium">DB Status</span>
                            <span className={`font-semibold mt-1 ${health.database?.status === "connected" ? "text-green-600" : "text-red-500"}`}>{health.database?.status}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-gray-500 text-xs uppercase font-medium">Uptime</span>
                            <span className="font-semibold mt-1 text-gray-900 dark:text-white">{health.system?.uptime}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-gray-500 text-xs uppercase font-medium">Heap Memory</span>
                            <span className="font-semibold mt-1 text-gray-900 dark:text-white">{health.system?.memoryUsedMB} / {health.system?.memoryTotalMB} MB</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-gray-500 text-xs uppercase font-medium">Last Backup</span>
                            <span className="font-semibold mt-1 text-gray-900 dark:text-white">{health.database?.lastBackupAt ? new Date(health.database.lastBackupAt).toLocaleDateString() : "Never"}</span>
                        </div>
                    </div>
                    {health.recentErrors?.length > 0 && (
                        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                            <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-2">Recent Errors</p>
                            {health.recentErrors.slice(0, 3).map((e: string, i: number) => (
                                <p key={i} className="text-xs font-mono text-red-600 dark:text-red-300 truncate">{e}</p>
                            ))}
                        </div>
                    )}
                </div>
            )}
                <div className="rounded-xl bg-white shadow p-6 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Plan Popularity</h2>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.charts.planPopularity} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                                <XAxis dataKey="name" stroke="#6B7280" />
                                <YAxis stroke="#6B7280" />
                                <Tooltip cursor={{ fill: 'transparent' }} />
                                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]}>
                                    {data.charts.planPopularity.map((_: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Alerts Section */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                <div className="rounded-xl bg-red-50 p-6 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30">
                    <h2 className="text-lg font-semibold text-red-800 dark:text-red-400 mb-4 flex items-center">
                        <span className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></span>
                        Expiring Today
                    </h2>
                    {data.alerts.expiringToday.length > 0 ? (
                        <ul className="space-y-3">
                            {data.alerts.expiringToday.map((m: any) => (
                                <li key={m._id} className="flex justify-between items-center text-sm">
                                    <div>
                                        <span className="font-medium text-red-900 dark:text-red-200">{m.name}</span>
                                        <span className="text-red-700 dark:text-red-300 ml-2">({m.memberId})</span>
                                    </div>
                                    <span className="text-red-600 dark:text-red-400">{m.phone}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-red-600 dark:text-red-400">No members expiring today.</p>
                    )}
                </div>

                <div className="rounded-xl bg-orange-50 p-6 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-900/30">
                    <h2 className="text-lg font-semibold text-orange-800 dark:text-orange-400 mb-4 flex items-center">
                        <span className="w-2 h-2 bg-orange-500 rounded-full mr-2 animate-pulse"></span>
                        Expiring in 3 Days
                    </h2>
                    {data.alerts.expiringSoon.length > 0 ? (
                        <ul className="space-y-3 shadow-inner max-h-48 overflow-y-auto">
                            {data.alerts.expiringSoon.map((m: any) => (
                                <li key={m._id} className="flex justify-between items-center text-sm py-1 border-b border-orange-200/50 dark:border-orange-800/50 last:border-0">
                                    <div>
                                        <span className="font-medium text-orange-900 dark:text-orange-200">{m.name}</span>
                                    </div>
                                    <span className="text-orange-600 dark:text-orange-400">{new Date(m.expiryDate).toLocaleDateString()}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-orange-600 dark:text-orange-400">No members expiring soon.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
