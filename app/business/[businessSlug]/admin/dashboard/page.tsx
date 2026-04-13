"use client";

import { useEffect, useState } from "react";
import { 
 ShoppingBag, 
 Users, 
 IndianRupee, 
 TrendingUp, 
 ArrowUpRight, 
 ArrowDownRight,
 Clock,
 Package
} from "lucide-react";

export default function BusinessDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [recentSales, setRecentSales] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/business/analytics", { cache: "no-store" });
        const json = await res.json();
        if (res.ok) {
          // Robust null-safety fallbacks for production resilience
          setStats(json.data?.stats || {});
          setRecentSales(json.data?.recentSales || []);
        } else {
          console.error("Analytics Error:", json.error);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#8b5cf6]"></div>
      </div>
    );
  }

  const cards = [
    { 
      title: "Today's Gross", 
      value: `₹${stats?.dailySales?.toLocaleString() || 0}`, 
      icon: ShoppingBag, 
      color: "text-[#38bdf8]", 
      bg: "bg-[#38bdf8]/10",
      trend: "+12%",
      isPositive: true
    },
    { 
      title: "Monthly Revenue", 
      value: `₹${stats?.monthlySales?.toLocaleString() || 0}`, 
      icon: TrendingUp, 
      color: "text-[#22c55e]", 
      bg: "bg-[#22c55e]/10",
      trend: "+8.4%",
      isPositive: true
    },
    { 
      title: "Total Receivables", 
      value: `₹${stats?.totalDue?.toLocaleString() || 0}`, 
      icon: IndianRupee, 
      color: "text-[#ef4444]", 
      bg: "bg-[#ef4444]/10",
      trend: "+2.1%",
      isPositive: false
    },
    { 
      title: "Yearly Performance", 
      value: `₹${stats?.yearlySales?.toLocaleString() || 0}`, 
      icon: ArrowUpRight, 
      color: "text-[#8b5cf6]", 
      bg: "bg-[#8b5cf6]/10",
      trend: "+15.2%",
      isPositive: true
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Welcome Header */}
      <div>
        <h2 className="text-2xl font-bold text-[#f9fafb] tracking-tight">Business Command Center</h2>
        <p className="text-[#9ca3af] text-sm mt-1 font-medium">Real-time operational overview and fiscal performance analytics.</p>
      </div>

      {/* Scorecards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, i) => (
          <div key={i} className="group relative overflow-hidden p-6 rounded-2xl bg-[#0b1220] border border-[#1f2937] hover:border-[#8b5cf6]/30 transition-all duration-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2 rounded-xl border border-transparent ${card.bg}`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${card.isPositive ? 'bg-[#22c55e]/10 text-[#22c55e]' : 'bg-[#ef4444]/10 text-[#ef4444]'}`}>
                {card.isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {card.trend}
              </div>
            </div>
            <p className="text-xs font-bold text-[#9ca3af] uppercase tracking-widest">{card.title}</p>
            <h3 className="text-2xl font-bold text-[#f9fafb] mt-1">{card.value}</h3>
          </div>
        ))}
      </div>

      {/* Lower Grid: Mixed Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity Table */}
        <div className="lg:col-span-2 rounded-2xl bg-[#0b1220] border border-[#1f2937] overflow-hidden shadow-sm">
          <div className="px-6 py-5 border-b border-[#1f2937] flex items-center justify-between bg-[#0b1220]">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#8b5cf6]" />
              <h3 className="text-sm font-bold text-[#f9fafb]">Recent Sales</h3>
            </div>
            <button className="text-[10px] font-bold text-[#8b5cf6] hover:text-[#7c3aed] uppercase tracking-widest transition-colors">View Ledger</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#0b1220] border-b border-[#1f2937]">
                  <th className="px-6 py-5 text-sm font-semibold text-[#9ca3af] uppercase tracking-wide">Customer</th>
                  <th className="px-6 py-5 text-sm font-semibold text-[#9ca3af] uppercase tracking-wide">Items</th>
                  <th className="px-6 py-5 text-sm font-semibold text-[#9ca3af] uppercase tracking-wide text-right">Amount</th>
                  <th className="px-6 py-5 text-sm font-semibold text-[#9ca3af] uppercase tracking-wide text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f2937]">
                {recentSales.length > 0 ? recentSales.map((sale: any, i) => (
                  <tr key={i} className="hover:bg-[#8b5cf6]/5 transition-colors group border-b border-slate-800 last:border-0">
                    <td className="px-6 py-5">
                      <p className="text-base font-semibold text-white">{sale.customerId?.name || "N/A"}</p>
                      <p className="text-sm font-medium text-slate-400 mt-0.5">{new Date(sale.date).toLocaleDateString()}</p>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center -space-x-1.5 overflow-hidden">
                        {sale.items?.slice(0, 3).map((item: any, idx: number) => (
                          <div key={idx} className="h-10 w-10 rounded-xl bg-[#111827] border border-[#1f2937] flex items-center justify-center text-xs font-bold text-white ring-2 ring-[#0b1220]">
                            {item.name[0]}
                          </div>
                        ))}
                        {sale.items?.length > 3 && (
                          <div className="h-10 w-10 rounded-xl bg-[#8b5cf6]/20 border border-[#8b5cf6]/30 flex items-center justify-center text-xs font-bold text-[#8b5cf6] ring-2 ring-[#0b1220]">
                            +{sale.items.length - 3}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <p className="text-lg font-semibold text-[#f9fafb]">₹{sale.amount.toLocaleString()}</p>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <span className="inline-flex items-center px-4 py-1.5 rounded-md text-xs font-semibold bg-[#8b5cf6]/10 text-[#8b5cf6] border border-[#8b5cf6]/20 uppercase tracking-wider">
                        Processed
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <ShoppingBag className="w-8 h-8 text-[#9ca3af] mb-3" />
                        <p className="text-sm text-[#9ca3af] font-medium">No sales transactions on record.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Shortcuts / Insights */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-[#8b5cf6] shadow-lg relative overflow-hidden group">
            <div className="relative z-10">
              <h4 className="text-sm font-bold text-white mb-2">Inventory Alert</h4>
              <p className="text-xs text-white/80 mb-4 font-medium leading-relaxed">
                4 items are currently running below their defined threshold. Stock up to avoid operational disruption.
              </p>
              <button className="flex items-center justify-center gap-2 px-4 py-2 bg-[#020617]/20 hover:bg-[#020617]/30 rounded-xl text-xs font-bold text-white transition-all uppercase tracking-widest">
                <Package className="w-3.5 h-3.5" />
                Review Stock
              </button>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-[#0b1220] border border-[#1f2937] shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-[#f9fafb]">Recent Payments</h3>
              <div className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
            </div>
            <div className="space-y-4">
              {/* Visual mockup for payments */}
              {[1, 2, 3].map((_, i) => (
                <div key={i} className="flex items-center gap-3 group px-2 py-1 -mx-2 hover:bg-[#8b5cf6]/5 rounded-xl transition-all cursor-default">
                  <div className="w-8 h-8 rounded-lg bg-[#22c55e]/10 flex items-center justify-center border border-[#22c55e]/20">
                    <IndianRupee className="w-4 h-4 text-[#22c55e]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[#f9fafb] truncate group-hover:text-[#8b5cf6] transition-colors">Payment Received</p>
                    <p className="text-[10px] text-[#9ca3af] font-medium">Via UPI Bank Transfer</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-[#22c55e]">+₹4,500</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
