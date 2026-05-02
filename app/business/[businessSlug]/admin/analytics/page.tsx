"use client";

import React, { useState, useEffect } from "react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, Legend
} from "recharts";
import { 
  TrendingUp, BarChart3, Calendar, Loader2, DollarSign, Users, Activity, CreditCard, Box, TrendingDown, AlertTriangle
} from "lucide-react";
import { useAdvancedAnalytics } from "@/hooks/useAnalytics";

export default function AnalyticsDashboard() {
  const [timeframe, setTimeframe] = useState("30d");
  const [mounted, setMounted] = useState(false);
  
  const { data, isLoading: loading, error, refetch } = useAdvancedAnalytics(timeframe);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-[#8b5cf6] animate-spin" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertTriangle className="w-10 h-10 text-[#ef4444]" />
        <p className="text-[#ef4444] font-bold text-lg">Failed to load analytics</p>
        <p className="text-[#9ca3af] text-sm">{error instanceof Error ? error.message : "Error"}</p>
        <button onClick={() => refetch()} className="px-4 py-2 bg-[#8b5cf6] text-white rounded-lg text-sm font-bold hover:bg-[#7c3aed] transition-colors">Retry</button>
      </div>
    );
  }

  const {
    businessSummary,
    trendData,
    yearlyReport,
    customerInsights,
    productAnalytics,
    paymentAnalytics,
    healthIndicators
  } = data || {};

  const COLORS = ['#8b5cf6', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6'];

  return (
    <div className={`space-y-6 animate-in fade-in duration-300 max-w-7xl mx-auto pb-10 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
      {/* Header */}
      <div className="bg-[#0b1220] p-7 rounded-2xl border border-[#1f2937] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-[#f9fafb] tracking-tight">Business Intelligence Dashboard</h2>
          <p className="text-[#9ca3af] text-base font-medium mt-1.5">Comprehensive fiscal analysis and long-term reporting.</p>
        </div>
        <div className="flex bg-[#111827] p-1 rounded-xl border border-[#1f2937]">
          {['7d', '30d', 'yearly'].map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors ${
                timeframe === tf ? "bg-[#8b5cf6] text-white" : "text-[#9ca3af] hover:text-[#f9fafb]"
              }`}
            >
              {tf === '7d' ? '7 Days' : tf === '30d' ? '30 Days' : 'Yearly'}
            </button>
          ))}
        </div>
      </div>

      {/* 1. BUSINESS SUMMARY */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <MetricCard title="Total Revenue" value={businessSummary?.totalRevenue} icon={<TrendingUp />} color="#22c55e" />
        <MetricCard title="Total Expenses" value={businessSummary?.totalExpenses} icon={<TrendingDown />} color="#ef4444" />
        <MetricCard title="Net Profit" value={businessSummary?.netProfit} icon={<DollarSign />} color="#8b5cf6" />
        <MetricCard title="Total Receivables" value={businessSummary?.totalReceivables} icon={<CreditCard />} color="#f59e0b" subtitle="Money to collect" />
        <MetricCard title="Total Payables" value={businessSummary?.totalPayables} icon={<CreditCard />} color="#ef4444" subtitle="Money to pay" />
        {/* Cash Flow card with in/out breakdown */}
        <div className={`p-6 rounded-2xl bg-[#0b1220] border border-[#1f2937] shadow-sm`} style={{ backgroundImage: `linear-gradient(to bottom right, ${businessSummary?.currentCashFlow >= 0 ? '#22c55e' : '#ef4444'}10, transparent)` }}>
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl" style={{ backgroundColor: `${businessSummary?.currentCashFlow >= 0 ? '#22c55e' : '#ef4444'}15`, color: businessSummary?.currentCashFlow >= 0 ? '#22c55e' : '#ef4444' }}>
              <Activity className="w-6 h-6" />
            </div>
            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${businessSummary?.currentCashFlow >= 0 ? 'bg-[#22c55e]/20 text-[#22c55e]' : 'bg-[#ef4444]/20 text-[#ef4444]'}`}>
              {businessSummary?.currentCashFlow >= 0 ? 'Positive' : 'Negative'}
            </span>
          </div>
          <p className="text-xs font-bold text-[#9ca3af] uppercase tracking-widest mb-1">Cash Flow</p>
          <h3 className="text-3xl font-bold text-[#f9fafb]">₹{businessSummary?.currentCashFlow?.toLocaleString('en-IN') || 0}</h3>
          <div className="flex gap-4 mt-3 pt-3 border-t border-[#1f2937]">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[#22c55e]" />
              <span className="text-xs text-[#9ca3af]">In: </span>
              <span className="text-xs font-bold text-[#22c55e]">₹{businessSummary?.cashIn?.toLocaleString('en-IN') || 0}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[#ef4444]" />
              <span className="text-xs text-[#9ca3af]">Out: </span>
              <span className="text-xs font-bold text-[#ef4444]">₹{businessSummary?.cashOut?.toLocaleString('en-IN') || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2 & 3. TIME-BASED REPORTS & YEARLY REPORT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Chart */}
        <div className="p-7 rounded-2xl bg-[#0b1220] border border-[#1f2937] flex flex-col h-[450px] shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <BarChart3 className="w-5 h-5 text-[#8b5cf6]" />
            <h3 className="text-base font-bold text-[#f9fafb] uppercase tracking-widest">Revenue & Profit Trend</h3>
          </div>
          <div className="flex-1 w-full min-h-[300px]">
            {mounted && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorProf" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f2937" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '12px', color: '#fff' }} />
                  <Area type="monotone" dataKey="revenue" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorRev)" name="Revenue" />
                  <Area type="monotone" dataKey="profit" stroke="#22c55e" fillOpacity={1} fill="url(#colorProf)" name="Profit" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Yearly Growth Bar Chart */}
        <div className="p-7 rounded-2xl bg-[#0b1220] border border-[#1f2937] flex flex-col h-[450px] shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <Calendar className="w-5 h-5 text-[#22c55e]" />
            <h3 className="text-base font-bold text-[#f9fafb] uppercase tracking-widest">Yearly Performance</h3>
          </div>
          <div className="flex-1 w-full min-h-[300px]">
            {mounted && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={yearlyReport}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f2937" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '12px', color: '#fff' }} cursor={{fill: '#1f2937', opacity: 0.4}} />
                  <Bar dataKey="revenue" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Revenue" />
                  <Bar dataKey="profit" fill="#22c55e" radius={[4, 4, 0, 0]} name="Profit" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* 4 & 5. CUSTOMER & PRODUCT INSIGHTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-7 rounded-2xl bg-[#0b1220] border border-[#1f2937] shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <Users className="w-5 h-5 text-[#3b82f6]" />
            <h3 className="text-base font-bold text-[#f9fafb] uppercase tracking-widest">Customer Insights</h3>
          </div>
          <div className="space-y-6">
            <div>
              <h4 className="text-xs text-[#9ca3af] font-bold uppercase mb-3">Top 5 Customers by Revenue</h4>
              {customerInsights?.topCustomers?.length > 0 ? customerInsights.topCustomers.map((c: any, i: number) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-[#1f2937] last:border-0">
                  <span className="text-sm font-medium text-[#f9fafb]">{c.name}</span>
                  <span className="text-sm font-bold text-[#22c55e]">₹{c.totalPurchase?.toLocaleString('en-IN') || 0}</span>
                </div>
              )) : <div className="text-sm text-[#9ca3af]">No data available</div>}
            </div>
            <div>
              <h4 className="text-xs text-[#9ca3af] font-bold uppercase mb-3">Highest Pending Balance</h4>
              {customerInsights?.highestPending?.length > 0 ? customerInsights.highestPending.map((c: any, i: number) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-[#1f2937] last:border-0">
                  <span className="text-sm font-medium text-[#f9fafb]">{c.name}</span>
                  <span className="text-sm font-bold text-[#ef4444]">₹{c.currentDue?.toLocaleString('en-IN') || 0}</span>
                </div>
              )) : <div className="text-sm text-[#9ca3af]">No pending balances</div>}
            </div>
          </div>
        </div>

        <div className="p-7 rounded-2xl bg-[#0b1220] border border-[#1f2937] shadow-sm flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <Box className="w-5 h-5 text-[#f59e0b]" />
            <h3 className="text-base font-bold text-[#f9fafb] uppercase tracking-widest">Product Analytics</h3>
          </div>
          <div className="flex-1 w-full flex flex-col items-center justify-center min-h-[250px]">
            {productAnalytics?.topProducts?.length > 0 ? (
              mounted && (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={productAnalytics.topProducts}
                      cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5}
                      dataKey="totalRevenue" nameKey="_id" stroke="none"
                    >
                      {productAnalytics.topProducts.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '12px', color: '#fff' }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )
            ) : (
              <div className="text-sm text-[#9ca3af]">No product sales data available</div>
            )}
          </div>
        </div>
      </div>

      {/* 6 & 7. PAYMENTS & BUSINESS HEALTH */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-7 rounded-2xl bg-[#0b1220] border border-[#1f2937] shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <CreditCard className="w-5 h-5 text-[#8b5cf6]" />
            <h3 className="text-base font-bold text-[#f9fafb] uppercase tracking-widest">Payment Analytics</h3>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between p-4 bg-[#111827] rounded-xl border border-[#1f2937]">
              <span className="text-sm font-medium text-[#9ca3af]">Total Received</span>
              <span className="text-lg font-bold text-[#22c55e]">₹{paymentAnalytics?.totalReceived?.toLocaleString('en-IN') || 0}</span>
            </div>
            <div className="flex justify-between p-4 bg-[#111827] rounded-xl border border-[#1f2937]">
              <span className="text-sm font-medium text-[#9ca3af]">Total Given</span>
              <span className="text-lg font-bold text-[#ef4444]">₹{paymentAnalytics?.totalGiven?.toLocaleString('en-IN') || 0}</span>
            </div>
            <div className="pt-4 border-t border-[#1f2937]">
              <h4 className="text-xs text-[#9ca3af] font-bold uppercase mb-3">Methods Breakdown</h4>
              {paymentAnalytics?.methodsBreakdown?.length > 0 ? paymentAnalytics.methodsBreakdown.map((m: any, i: number) => (
                <div key={i} className="flex justify-between py-1 text-sm text-[#f9fafb]">
                  <span className="uppercase">{m.method}</span>
                  <span className="font-medium">₹{m.total?.toLocaleString('en-IN') || 0}</span>
                </div>
              )) : <div className="text-sm text-[#9ca3af]">No payment data</div>}
            </div>
          </div>
        </div>

        <div className="p-7 rounded-2xl bg-[#0b1220] border border-[#1f2937] shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <Activity className="w-5 h-5 text-[#22c55e]" />
            <h3 className="text-base font-bold text-[#f9fafb] uppercase tracking-widest">Business Health</h3>
          </div>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-[#9ca3af]">Profit Margin</span>
                <span className="text-sm font-bold text-[#f9fafb]">{healthIndicators?.profitMargin || 0}%</span>
              </div>
              <div className="w-full bg-[#111827] rounded-full h-2">
                <div className="bg-[#8b5cf6] h-2 rounded-full transition-all duration-1000" style={{ width: `${Math.min(Math.max(healthIndicators?.profitMargin || 0, 0), 100)}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-[#9ca3af]">Receivable Ratio</span>
                <span className="text-sm font-bold text-[#f9fafb]">{healthIndicators?.receivableRatio || 0}%</span>
              </div>
              <div className="w-full bg-[#111827] rounded-full h-2">
                <div className="bg-[#f59e0b] h-2 rounded-full transition-all duration-1000" style={{ width: `${Math.min(Math.max(healthIndicators?.receivableRatio || 0, 0), 100)}%` }} />
              </div>
            </div>
            <div className="p-4 bg-[#111827] rounded-xl border border-[#1f2937] mt-4 flex justify-between items-center">
              <span className="text-sm font-medium text-[#9ca3af]">Cash Flow Status</span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${
                healthIndicators?.cashFlowStatus === 'Positive' ? 'bg-[#22c55e]/20 text-[#22c55e]' : 'bg-[#ef4444]/20 text-[#ef4444]'
              }`}>
                {healthIndicators?.cashFlowStatus || 'Unknown'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon, color, subtitle }: any) {
  return (
    <div className={`p-6 rounded-2xl bg-[#0b1220] border border-[#1f2937] shadow-sm`} style={{ backgroundImage: `linear-gradient(to bottom right, ${color}10, transparent)` }}>
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 rounded-xl" style={{ backgroundColor: `${color}15`, color: color }}>
          {icon}
        </div>
        {subtitle && <span className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest">{subtitle}</span>}
      </div>
      <p className="text-xs font-bold text-[#9ca3af] uppercase tracking-widest mb-1">{title}</p>
      <h3 className="text-3xl font-bold text-[#f9fafb]">₹{value?.toLocaleString('en-IN') || 0}</h3>
    </div>
  );
}
