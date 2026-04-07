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
    Legend
} from "recharts";
import { Loader2, TrendingUp, Users } from "lucide-react";
import { useHostelBlock } from "@/components/hostel/HostelBlockContext";
import { HostelBlockFilter } from "@/components/hostel/HostelBlockFilter";

const COLORS = ["#6366f1", "#10B981", "#ef4444", "#f59e0b", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6"];

export default function HostelGraphAnalysisPage() {
    const { data: session } = useSession();
    const { selectedBlock, blocks: contextBlocks } = useHostelBlock();
    
    const [incomeData, setIncomeData] = useState<any[]>([]);
    const [memberData, setMemberData] = useState<any[]>([]);
    const [checkoutData, setCheckoutData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        if (!session) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                const blockParam = `?block=${encodeURIComponent(selectedBlock)}`;
                const [resIncome, resMembers, resCheckouts] = await Promise.all([
                    fetch(`/api/hostel/analytics/monthly-income${blockParam}`),
                    fetch(`/api/hostel/analytics/monthly-members${blockParam}`),
                    fetch(`/api/hostel/analytics/monthly-checkouts${blockParam}`),
                ]);

                if (resIncome.ok) setIncomeData(await resIncome.json());
                if (resMembers.ok) setMemberData(await resMembers.json());
                if (resCheckouts.ok) setCheckoutData(await resCheckouts.json());
            } catch (error) {
                console.error("Failed to fetch hostel graph data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [session, selectedBlock]);

    if (loading && !incomeData.length) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
        );
    }

    const GenericTooltip = ({ active, payload, label, prefix = "", suffix = "" }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-gray-900 border border-gray-700 p-3 rounded-md shadow-xl text-sm min-w-[150px]">
                    <p className="text-gray-200 font-bold mb-2 pb-1 border-b border-gray-800">{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex justify-between items-center gap-4 py-0.5">
                            <span className="font-medium" style={{ color: entry.color }}>
                                {entry.name === 'value' ? 'Total' : `Block ${entry.name}`}
                            </span>
                            <span className="text-gray-200 font-semibold">
                                {prefix}{(entry.value || 0).toLocaleString()}{suffix}
                            </span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    const renderBars = (defaultColor: string) => {
        if (selectedBlock === "all") {
            return contextBlocks.map((b, i) => (
                <Bar key={b} dataKey={b} name={b} fill={COLORS[i % COLORS.length]} radius={[6, 6, 0, 0]} maxBarSize={30} />
            ));
        }
        return <Bar dataKey="value" name="value" fill={defaultColor} radius={[6, 6, 0, 0]} maxBarSize={40} />;
    };

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in zoom-in duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-100 sm:text-3xl tracking-tight">Graph Analysis</h1>
                    <p className="text-sm text-gray-400 mt-1 flex items-center gap-2">
                        Visualize growth over the last 12 months
                        {selectedBlock !== "all" && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-400">
                                Block {selectedBlock} Filtered
                            </span>
                        )}
                    </p>
                </div>
                <div className="flex-shrink-0">
                    <HostelBlockFilter />
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* Income Chart */}
                <div className="bg-gray-900 p-6 rounded-2xl shadow-xl border border-gray-800 flex flex-col transition-all hover:shadow-2xl">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-indigo-500/10 rounded-xl">
                                <TrendingUp className="w-5 h-5 text-indigo-400" />
                            </div>
                            <h2 className="text-lg font-semibold text-gray-100">Monthly Income</h2>
                        </div>
                        {loading && <Loader2 className="w-4 h-4 animate-spin text-indigo-500/50" />}
                    </div>
                    <div className="w-full min-h-[300px] flex items-center justify-center bg-gray-950/20 rounded-xl border border-gray-800/50">
                        {isMounted ? (
                            incomeData.length > 0 ? (
                                <ResponsiveContainer width="100%" aspect={2}>
                                    <BarChart data={incomeData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                                        <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} dy={10} />
                                        <YAxis tickLine={false} axisLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} tickFormatter={(value) => `₹${value}`} dx={-10} width={90} />
                                        <Tooltip content={<GenericTooltip prefix="₹" />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                                        {selectedBlock === "all" && <Legend wrapperStyle={{ paddingTop: "20px" }} iconType="circle" />}
                                        {renderBars("#6366f1")}
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : <div className="text-gray-500 text-sm font-medium">No income data available.</div>
                        ) : <Loader2 className="w-6 h-6 animate-spin text-gray-700" />}
                    </div>
                </div>

                {/* Member Chart */}
                <div className="bg-gray-900 p-6 rounded-2xl shadow-xl border border-gray-800 flex flex-col transition-all hover:shadow-2xl">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-emerald-500/10 rounded-xl">
                                <Users className="w-5 h-5 text-emerald-400" />
                            </div>
                            <h2 className="text-lg font-semibold text-gray-100">Members Joined</h2>
                        </div>
                        {loading && <Loader2 className="w-4 h-4 animate-spin text-emerald-500/50" />}
                    </div>
                    <div className="w-full min-h-[300px] flex items-center justify-center bg-gray-950/20 rounded-xl border border-gray-800/50">
                        {isMounted ? (
                            memberData.length > 0 ? (
                                <ResponsiveContainer width="100%" aspect={2}>
                                    <BarChart data={memberData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                                        <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} dy={10} />
                                        <YAxis tickLine={false} axisLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} dx={-10} width={40} />
                                        <Tooltip content={<GenericTooltip suffix=" joined" />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                                        {selectedBlock === "all" && <Legend wrapperStyle={{ paddingTop: "20px" }} iconType="circle" />}
                                        {renderBars("#10B981")}
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : <div className="text-gray-500 text-sm font-medium">No member data available.</div>
                        ) : <Loader2 className="w-6 h-6 animate-spin text-gray-700" />}
                    </div>
                </div>

                {/* Checkout Chart */}
                <div className="bg-gray-900 p-6 rounded-2xl shadow-xl border border-gray-800 flex flex-col transition-all hover:shadow-2xl">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-red-500/10 rounded-xl">
                                <Users className="w-5 h-5 text-red-400" />
                            </div>
                            <h2 className="text-lg font-semibold text-gray-100">Members Checkout</h2>
                        </div>
                        {loading && <Loader2 className="w-4 h-4 animate-spin text-red-500/50" />}
                    </div>
                    <div className="w-full min-h-[300px] flex items-center justify-center bg-gray-950/20 rounded-xl border border-gray-800/50">
                        {isMounted ? (
                            checkoutData.length > 0 ? (
                                <ResponsiveContainer width="100%" aspect={2}>
                                    <BarChart data={checkoutData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                                        <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} dy={10} />
                                        <YAxis tickLine={false} axisLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} dx={-10} width={40} />
                                        <Tooltip content={<GenericTooltip suffix=" left" />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                                        {selectedBlock === "all" && <Legend wrapperStyle={{ paddingTop: "20px" }} iconType="circle" />}
                                        {renderBars("#ef4444")}
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : <div className="text-gray-500 text-sm font-medium">No checkout data available.</div>
                        ) : <Loader2 className="w-6 h-6 animate-spin text-gray-700" />}
                    </div>
                </div>
            </div>
        </div>
    );
}
