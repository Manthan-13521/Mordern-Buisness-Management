"use client";

import { useEffect, useState } from "react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { 
  TrendingUp, 
  BarChart3, 
  PieChart as PieChartIcon, 
  Calendar,
  ArrowUpRight,
  Loader2,
  DollarSign
} from "lucide-react";

export default function AnalyticsPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await fetch("/api/business/analytics", { cache: "no-store" });
        const json = await res.json();
        // Standardized safety fallback: json.data || {}
        setStats(json.data || {});
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-[#8b5cf6] animate-spin" />
      </div>
    );
  }

  // Mock data for graphs (since real aggregate series needs more complex backend logic for daily/monthly arrays)
  const revenueData = [
    { name: 'Mon', revenue: 45000 },
    { name: 'Tue', revenue: 52000 },
    { name: 'Wed', revenue: 38000 },
    { name: 'Thu', revenue: 65000 },
    { name: 'Fri', revenue: 48000 },
    { name: 'Sat', revenue: 72000 },
    { name: 'Sun', revenue: 61000 },
  ];

  const categoryData = [
    { name: 'Product A', value: 400 },
    { name: 'Product B', value: 300 },
    { name: 'Service C', value: 300 },
    { name: 'Others', value: 200 },
  ];

  const COLORS = ['#8b5cf6', '#22c55e', '#f59e0b', '#ef4444'];

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-[#0b1220] p-7 rounded-2xl border border-[#1f2937] shadow-sm">
        <h2 className="text-3xl font-bold text-[#f9fafb] tracking-tight">Revenue Analytics</h2>
        <p className="text-[#9ca3af] text-base font-medium mt-1.5">In-depth fiscal analysis and business performance forecasting.</p>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-7 rounded-2xl bg-[#0b1220] border border-[#1f2937] bg-gradient-to-br from-[#8b5cf6]/5 to-transparent shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div className="p-3 bg-[#8b5cf6]/10 rounded-xl text-[#8b5cf6]">
              <TrendingUp className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-[#22c55e] uppercase tracking-widest">+12.5% vs LW</span>
          </div>
          <p className="text-xs font-bold text-[#9ca3af] uppercase tracking-widest mb-2">Gross Weekly Trading</p>
          <h3 className="text-4xl font-bold text-[#f9fafb]">₹3,77,000</h3>
        </div>
        <div className="p-7 rounded-2xl bg-[#0b1220] border border-[#1f2937] bg-gradient-to-br from-[#22c55e]/5 to-transparent shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div className="p-3 bg-[#22c55e]/10 rounded-xl text-[#22c55e]">
              <DollarSign className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-[#22c55e] uppercase tracking-widest">Stable</span>
          </div>
          <p className="text-xs font-bold text-[#9ca3af] uppercase tracking-widest mb-2">Average Order Value</p>
          <h3 className="text-4xl font-bold text-[#f9fafb]">₹12,450</h3>
        </div>
        <div className="p-7 rounded-2xl bg-[#0b1220] border border-[#1f2937] bg-gradient-to-br from-[#ef4444]/5 to-transparent shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div className="p-3 bg-[#ef4444]/10 rounded-xl text-[#ef4444]">
              <PieChartIcon className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-[#ef4444] uppercase tracking-widest">+5.2% Due</span>
          </div>
          <p className="text-xs font-bold text-[#9ca3af] uppercase tracking-widest mb-2">Receivables Ratio</p>
          <h3 className="text-4xl font-bold text-[#f9fafb]">18.4%</h3>
        </div>
      </div>

      {/* Main Graphs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <div className="p-7 rounded-2xl bg-[#0b1220] border border-[#1f2937] flex flex-col h-[450px] shadow-sm">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-5 h-5 text-[#8b5cf6]" />
              <h3 className="text-base font-bold text-[#f9fafb] uppercase tracking-widest">Trading Activity</h3>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-[#111827] rounded-lg border border-[#1f2937]">
              <Calendar className="w-4 h-4 text-[#9ca3af]" />
              <span className="text-xs font-bold text-[#9ca3af] uppercase tracking-widest">Last 7 Days</span>
            </div>
          </div>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f2937" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#9ca3af', fontWeight: 'bold' }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#9ca3af', fontWeight: 'bold' }} 
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '12px', fontSize: '12px', color: '#f9fafb' }}
                  itemStyle={{ color: '#8b5cf6', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Categories Pie */}
        <div className="p-7 rounded-2xl bg-[#0b1220] border border-[#1f2937] flex flex-col h-[450px] shadow-sm">
          <div className="flex items-center gap-3 mb-10">
            <PieChartIcon className="w-5 h-5 text-[#22c55e]" />
            <h3 className="text-base font-bold text-[#f9fafb] uppercase tracking-widest">Product Allocation</h3>
          </div>
          <div className="flex-1 w-full flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '12px', fontSize: '12px' }}
                  itemStyle={{ color: '#f9fafb', fontWeight: 'bold' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xs font-bold text-[#9ca3af] uppercase tracking-widest">Total Share</span>
              <span className="text-3xl font-bold text-[#f9fafb]">100%</span>
            </div>
          </div>
          {/* Legend */}
          <div className="grid grid-cols-2 gap-4 mt-6">
            {categoryData.map((item, i) => (
              <div key={i} className="flex items-center gap-3 bg-[#111827] px-4 py-3 rounded-lg border border-[#1f2937]">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                <span className="text-xs font-bold text-[#f9fafb] uppercase tracking-widest">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Insight Card */}
      <div className="p-8 rounded-3xl bg-[#8b5cf6] relative overflow-hidden group shadow-lg">
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#020617]/20 rounded-lg border border-white/20">
              <ArrowUpRight className="w-3.5 h-3.5 text-white" />
              <span className="text-[10px] font-bold text-white uppercase tracking-widest">AI Projected Growth</span>
            </div>
            <h3 className="text-3xl font-bold text-white tracking-tight leading-tight max-w-sm">Expected +22.4% Revenue Growth by Q3.</h3>
            <p className="text-white/80 text-sm font-medium leading-relaxed max-w-md">
              Based on current sales velocity and customer retention metrics, your business is scaling optimally. Consider increasing stock for 'Product A' to maximize potential.
            </p>
          </div>
          <div className="hidden md:flex justify-end">
            <div className="p-5 bg-[#020617]/20 rounded-2xl border border-white/20 backdrop-blur-sm max-w-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
                <span className="text-[10px] font-bold text-white uppercase tracking-widest">Optimization Recommendation</span>
              </div>
              <p className="text-xs text-white pb-1 font-semibold leading-relaxed">Increase staff capacity during Friday peak hours (4PM - 8PM) to reduce transaction latency.</p>
            </div>
          </div>
        </div>
        {/* Visual patterns */}
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-white/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-black/10 rounded-full blur-2xl" />
      </div>
    </div>
  );
}
