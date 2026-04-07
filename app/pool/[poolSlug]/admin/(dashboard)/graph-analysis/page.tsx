"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import { Loader2, TrendingUp, Users } from "lucide-react";
import { usePoolType } from "@/components/pool/PoolTypeContext";
import { PoolTypeFilter } from "@/components/pool/PoolTypeFilter";

interface IncomeData {
    month: string;
    total_income: number;
}

interface MemberData {
    month: string;
    total_members: number;
}

interface WeeklyIncomeData {
    week: string;
    total_income: number;
}

interface WeeklyMemberData {
    week: string;
    total_members: number;
}

interface DailyMemberData {
    date: string;
    total_members: number;
}

export default function GraphAnalysisPage() {
    const { data: session } = useSession();
    const [incomeData, setIncomeData] = useState<IncomeData[]>([]);
    const [memberData, setMemberData] = useState<MemberData[]>([]);
    const [weeklyIncomeData, setWeeklyIncomeData] = useState<WeeklyIncomeData[]>([]);
    const [weeklyMemberData, setWeeklyMemberData] = useState<WeeklyMemberData[]>([]);
    const [dailyMemberData, setDailyMemberData] = useState<DailyMemberData[]>([]);
    const [loading, setLoading] = useState(true);
    const [isMounted, setIsMounted] = useState(false);
    const { selectedType } = usePoolType();

    useEffect(() => {
        setIsMounted(true);
        if (!session) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                const [resIncome, resMembers, resWeeklyIncome, resWeeklyMembers, resDailyMembers] = await Promise.all([
                    fetch(`/api/analytics/monthly-income?type=${selectedType}`),
                    fetch(`/api/analytics/monthly-members?type=${selectedType}`),
                    fetch(`/api/analytics/weekly-income?type=${selectedType}`),
                    fetch(`/api/analytics/weekly-members?type=${selectedType}`),
                    fetch(`/api/analytics/daily-members?type=${selectedType}`),
                ]);

                if (resIncome.ok) setIncomeData(await resIncome.json());
                if (resMembers.ok) setMemberData(await resMembers.json());
                if (resWeeklyIncome.ok) setWeeklyIncomeData(await resWeeklyIncome.json());
                if (resWeeklyMembers.ok) setWeeklyMemberData(await resWeeklyMembers.json());
                if (resDailyMembers.ok) setDailyMemberData(await resDailyMembers.json());
            } catch (error) {
                console.error("Failed to fetch graph data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [session, selectedType]);

    if (loading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
        );
    }

    const formatCurrency = (value: number) => `₹${value.toLocaleString()}`;

    const IncomeTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-gray-900 border border-gray-700 p-3 rounded-md shadow-xl text-sm">
                    <p className="text-gray-200 font-semibold mb-1">{label}</p>
                    <p className="text-indigo-400 font-medium">Income: {formatCurrency(payload[0].value)}</p>
                </div>
            );
        }
        return null;
    };

    const MemberTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-gray-900 border border-gray-700 p-3 rounded-md shadow-xl text-sm">
                    <p className="text-gray-200 font-semibold mb-1">{label}</p>
                    <p className="text-emerald-400 font-medium">Joined: {payload[0].value} members</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in zoom-in duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-100 sm:text-3xl tracking-tight">Graph Analysis</h1>
                    <p className="text-sm text-gray-400 mt-1">Visualize growth over the last 12 months</p>
                </div>
                <div className="flex-shrink-0">
                    <PoolTypeFilter />
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* Income Chart */}
                <div className="bg-gray-900 p-6 rounded-2xl shadow-xl border border-gray-800 flex flex-col transition-all hover:shadow-2xl">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-indigo-500/10 rounded-xl">
                            <TrendingUp className="w-5 h-5 text-indigo-400" />
                        </div>
                        <h2 className="text-lg font-semibold text-gray-100">Monthly Income</h2>
                    </div>
                    <div className="w-full min-h-[300px] flex items-center justify-center bg-gray-950/20 rounded-xl border border-gray-800/50">
                        {isMounted ? (
                            incomeData.length > 0 ? (
                                <ResponsiveContainer width="100%" aspect={2}>
                                    <BarChart data={incomeData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                                        <XAxis 
                                            dataKey="month" 
                                            tickLine={false}
                                            axisLine={false}
                                            tick={{ fill: '#9CA3AF', fontSize: 12 }}
                                            dy={10}
                                        />
                                        <YAxis 
                                            tickLine={false}
                                            axisLine={false}
                                            tick={{ fill: '#9CA3AF', fontSize: 12 }}
                                            tickFormatter={(value) => `₹${value}`}
                                            dx={-10}
                                            width={70}
                                        />
                                        <Tooltip content={<IncomeTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                                        <Bar 
                                            dataKey="total_income" 
                                            fill="#6366f1" 
                                            radius={[6, 6, 0, 0]}
                                            maxBarSize={40}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="text-gray-500 text-sm font-medium">No income data available for this period.</div>
                            )
                        ) : (
                            <Loader2 className="w-6 h-6 animate-spin text-gray-700" />
                        )}
                    </div>
                </div>

                {/* Member Chart */}
                <div className="bg-gray-900 p-6 rounded-2xl shadow-xl border border-gray-800 flex flex-col transition-all hover:shadow-2xl">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-green-500/10 rounded-xl">
                            <Users className="w-5 h-5 text-green-400" />
                        </div>
                        <h2 className="text-lg font-semibold text-gray-100">Monthly Members Joined</h2>
                    </div>
                    <div className="w-full min-h-[300px] flex items-center justify-center bg-gray-950/20 rounded-xl border border-gray-800/50">
                        {isMounted ? (
                            memberData.length > 0 ? (
                                <ResponsiveContainer width="100%" aspect={2}>
                                    <BarChart data={memberData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                                        <XAxis 
                                            dataKey="month" 
                                            tickLine={false}
                                            axisLine={false}
                                            tick={{ fill: '#9CA3AF', fontSize: 11 }}
                                            dy={10}
                                        />
                                        <YAxis 
                                            tickLine={false}
                                            axisLine={false}
                                            tick={{ fill: '#9CA3AF', fontSize: 11 }}
                                            dx={-10}
                                            width={40}
                                        />
                                        <Tooltip content={<MemberTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                                        <Bar 
                                            dataKey="total_members" 
                                            fill="#10B981" 
                                            radius={[6, 6, 0, 0]}
                                            maxBarSize={30}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="text-gray-500 text-sm font-medium">No member data available.</div>
                            )
                        ) : (
                            <Loader2 className="w-6 h-6 animate-spin text-gray-700" />
                        )}
                    </div>
                </div>

                {/* Weekly Income Chart */}
                <div className="bg-gray-900 p-6 rounded-2xl shadow-xl border border-gray-800 flex flex-col transition-all hover:shadow-2xl">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-blue-500/10 rounded-xl">
                            <TrendingUp className="w-5 h-5 text-blue-400" />
                        </div>
                        <h2 className="text-lg font-semibold text-gray-100">Weekly Income</h2>
                    </div>
                    <div className="w-full min-h-[300px] flex items-center justify-center bg-gray-950/20 rounded-xl border border-gray-800/50">
                        <ResponsiveContainer width="100%" aspect={2}>
                            <BarChart data={weeklyIncomeData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                                <XAxis dataKey="week" tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} dy={10} />
                                <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} dx={-10} tickFormatter={(value) => `₹${value}`} width={60} />
                                <Tooltip content={<IncomeTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                                <Bar dataKey="total_income" fill="#3B82F6" radius={[4, 4, 0, 0]} maxBarSize={30} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Weekly Members Chart */}
                <div className="bg-gray-900 p-6 rounded-2xl shadow-xl border border-gray-800 flex flex-col transition-all hover:shadow-2xl">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-emerald-500/10 rounded-xl">
                            <Users className="w-5 h-5 text-emerald-400" />
                        </div>
                        <h2 className="text-lg font-semibold text-gray-100">Weekly Members Joined</h2>
                    </div>
                    <div className="w-full min-h-[300px] flex items-center justify-center bg-gray-950/20 rounded-xl border border-gray-800/50">
                        <ResponsiveContainer width="100%" aspect={2}>
                            <BarChart data={weeklyMemberData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                                <XAxis dataKey="week" tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} dy={10} />
                                <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} dx={-10} width={40} />
                                <Tooltip content={<MemberTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                                <Bar dataKey="total_members" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={30} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Daily Members Chart */}
                <div className="bg-gray-900 p-6 rounded-2xl shadow-xl border border-gray-800 flex flex-col transition-all hover:shadow-2xl xl:col-span-2">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-orange-500/10 rounded-xl">
                            <TrendingUp className="w-5 h-5 text-orange-400" />
                        </div>
                        <h2 className="text-lg font-semibold text-gray-100">Daily Members Joined (Last 14 Days)</h2>
                    </div>
                    <div className="w-full min-h-[350px] flex items-center justify-center bg-gray-950/20 rounded-xl border border-gray-800/50">
                        <ResponsiveContainer width="100%" height={350}>
                            <BarChart data={dailyMemberData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                                <XAxis 
                                    dataKey="date" 
                                    tick={{ fill: '#9CA3AF', fontSize: 10 }} 
                                    axisLine={false} 
                                    tickLine={false} 
                                    dy={10}
                                    tickFormatter={(val) => val.split('-').slice(1).join('/')}
                                />
                                <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} dx={-10} width={40} />
                                <Tooltip content={<MemberTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                                <Bar dataKey="total_members" fill="#F59E0B" radius={[4, 4, 0, 0]} maxBarSize={50} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
