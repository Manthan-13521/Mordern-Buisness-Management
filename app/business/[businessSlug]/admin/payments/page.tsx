"use client";

import { useEffect, useState } from "react";
import { 
  CreditCard, 
  Plus, 
  Loader2, 
  Calendar, 
  Camera, 
  ArrowUpRight, 
  ArrowDownRight,
  Search,
  IndianRupee,
  History,
  Save
} from "lucide-react";
import toast from "react-hot-toast";
import clsx from "clsx";

export default function PaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [newPayment, setNewPayment] = useState({
    customerId: "",
    amount: 0,
    type: "cash",
    paymentType: "received",
    date: new Date().toISOString().split('T')[0],
    notes: ""
  });

  async function fetchData() {
    try {
      const [payRes, custRes] = await Promise.all([
        fetch("/api/business/payments"),
        fetch("/api/business/customers")
      ]);
      
      if (!payRes.ok) {
        toast.error("Failed to load payments");
      } else {
        const payData = await payRes.json();
        if (payData.success === false) {
          toast.error(payData.error || "Failed to load payments");
        } else {
          setPayments(Array.isArray(payData) ? payData : payData.data || []);
        }
      }
      
      if (!custRes.ok) {
        toast.error("Failed to load customers");
      } else {
        const custData = await custRes.json();
        setCustomers(Array.isArray(custData) ? custData : custData.data || custData);
      }
    } catch (err) {
      toast.error("Network error — please check your connection");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newPayment.customerId) return toast.error("Select a customer");
    if (newPayment.amount <= 0) return toast.error("Enter valid amount");

    setIsSaving(true);
    try {
      const res = await fetch("/api/business/payments", {
        method: "POST",
        body: JSON.stringify(newPayment),
      });
      if (res.ok) {
        toast.success("Payment recorded");
        setShowAddModal(false);
        setNewPayment({ ...newPayment, customerId: "", amount: 0, notes: "" });
        fetchData();
      } else {
        toast.error("Failed to save payment");
      }
    } catch (err) {
      toast.error("Network error");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0b1220] p-6 rounded-2xl border border-[#1f2937] shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-[#f9fafb] tracking-tight">Financial Ledger</h2>
          <p className="text-[#9ca3af] text-sm mt-1 font-medium">Monitor inflows and outflows across your entire business.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white px-7 py-3.5 rounded-xl font-bold text-base transition-all shadow-md"
        >
          <Plus className="w-5 h-5" />
          Record Payment
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-[#0b1220] border border-[#1f2937] flex items-center justify-between shadow-sm group">
          <div>
            <p className="text-xs font-bold text-[#9ca3af] uppercase tracking-widest mb-1.5">Total Receipts</p>
            <h4 className="text-2xl font-bold text-[#22c55e]">₹{payments.filter((p:any)=>p.transactionType==='received').reduce((s,p:any)=>s+p.amount, 0).toLocaleString()}</h4>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#22c55e]/10 flex items-center justify-center group-hover:scale-110 transition-transform">
            <ArrowDownRight className="w-6 h-6 text-[#22c55e]" />
          </div>
        </div>
        <div className="p-6 rounded-2xl bg-[#0b1220] border border-[#1f2937] flex items-center justify-between shadow-sm group">
          <div>
            <p className="text-xs font-bold text-[#9ca3af] uppercase tracking-widest mb-1.5">Total Disbursements</p>
            <h4 className="text-2xl font-bold text-[#ef4444]">₹{payments.filter((p:any)=>p.transactionType==='paid').reduce((s,p:any)=>s+p.amount, 0).toLocaleString()}</h4>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#ef4444]/10 flex items-center justify-center group-hover:scale-110 transition-transform">
            <ArrowUpRight className="w-6 h-6 text-[#ef4444]" />
          </div>
        </div>
      </div>

      {/* List */}
      <div className="bg-[#0b1220] border border-[#1f2937] rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 text-[#8b5cf6] animate-spin" />
          </div>
        ) : payments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-max">
              <thead>
                <tr className="bg-[#0b1220] border-b border-[#1f2937]">
                  <th className="px-6 py-5 text-sm font-semibold text-[#9ca3af] uppercase tracking-wide">Date</th>
                  <th className="px-6 py-5 text-sm font-semibold text-[#9ca3af] uppercase tracking-wide">Customer/Entity</th>
                  <th className="px-6 py-5 text-sm font-semibold text-[#9ca3af] uppercase tracking-wide">Channel</th>
                  <th className="px-6 py-5 text-sm font-semibold text-[#9ca3af] uppercase tracking-wide text-right">Amount</th>
                  <th className="px-6 py-5 text-sm font-semibold text-[#9ca3af] uppercase tracking-wide text-right">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f2937]">
                {payments.map((payment: any) => (
                  <tr key={payment._id} className="hover:bg-[#8b5cf6]/5 transition-colors group border-b border-slate-800 last:border-0">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2 text-base font-semibold text-white">
                        <Calendar className="w-5 h-5 text-[#9ca3af]" />
                        {new Date(payment.date).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-base font-semibold text-white group-hover:text-[#8b5cf6] transition-colors">{payment.customerId?.name || "Market Expense"}</p>
                      <p className="text-sm text-slate-400 font-medium max-w-xs truncate mt-0.5">{payment.notes || "No notes"}</p>
                    </td>
                    <td className="px-6 py-5">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-400">
                        <CreditCard className="w-5 h-5"/>
                        {payment.paymentMethod}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <p className={clsx(
                        "text-lg font-semibold",
                        payment.transactionType === 'received' ? "text-[#22c55e]" : "text-[#ef4444]"
                      )}>
                        {payment.transactionType === 'received' ? '+' : '-'}₹{payment.amount.toLocaleString()}
                      </p>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <span className={clsx(
                        "inline-flex items-center px-4 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider border",
                        payment.transactionType === 'received' ? "bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/20" : "bg-[#ef4444]/10 text-[#ef4444] border-[#ef4444]/20"
                      )}>
                        {payment.transactionType}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center bg-[#0b1220]">
            <div className="w-16 h-16 bg-[#111827] rounded-2xl flex items-center justify-center mb-6 border border-[#1f2937]">
              <History className="w-8 h-8 text-[#6b7280]" />
            </div>
            <h4 className="text-[#f9fafb] font-bold text-lg">Financial records empty</h4>
            <p className="text-[#9ca3af] text-sm mt-2 font-medium">Start tracking payments to see your cashflow.</p>
          </div>
        )}
      </div>

      {/* Add Payment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 duration-300" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-[#0b1220] border border-[#1f2937] w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#1f2937] flex items-center justify-between">
              <h3 className="font-bold text-[#f9fafb]">Entry Record Session</h3>
              <button onClick={() => setShowAddModal(false)} className="text-[#9ca3af] hover:text-[#f9fafb] transition-colors p-1 bg-[#111827] rounded-lg border border-[#1f2937]">
                <Plus className="w-4 h-4 rotate-45" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest block">Customer</label>
                <select 
                  required
                  value={newPayment.customerId}
                  onChange={(e) => setNewPayment({ ...newPayment, customerId: e.target.value })}
                  className="w-full bg-[#020617] border border-[#1f2937] rounded-xl px-4 py-3.5 text-sm font-medium text-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] appearance-none transition-all cursor-pointer"
                >
                  <option value="">Select Customer...</option>
                  {customers.map((c: any) => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest block">Entry Amount</label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8b5cf6]" />
                    <input 
                      required
                      type="number"
                      value={newPayment.amount || ""}
                      onChange={(e) => setNewPayment({ ...newPayment, amount: Number(e.target.value) })}
                      className="w-full bg-[#020617] border border-[#1f2937] rounded-xl pl-9 pr-4 py-2.5 text-sm font-bold text-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest block">Transaction Type</label>
                  <select 
                    required
                    value={newPayment.paymentType}
                    onChange={(e: any) => setNewPayment({ ...newPayment, paymentType: e.target.value })}
                    className="w-full bg-[#020617] border border-[#1f2937] rounded-xl px-4 py-2.5 text-sm font-medium text-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] appearance-none transition-all cursor-pointer"
                  >
                    <option value="received">Receive from Customer</option>
                    <option value="paid">Give to Customer</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest block">Method</label>
                  <select 
                    required
                    value={newPayment.type}
                    onChange={(e: any) => setNewPayment({ ...newPayment, type: e.target.value })}
                    className="w-full bg-[#020617] border border-[#1f2937] rounded-xl px-4 py-2.5 text-sm font-medium text-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] appearance-none transition-all cursor-pointer"
                  >
                    <option value="cash">Cash Settlement</option>
                    <option value="upi">UPI / Bank Transfer</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest block">Date</label>
                  <input 
                    type="date"
                    value={newPayment.date}
                    onChange={(e) => setNewPayment({ ...newPayment, date: e.target.value })}
                    className="w-full bg-[#020617] border border-[#1f2937] rounded-xl px-4 py-2.5 text-sm font-medium text-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all [color-scheme:dark]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest block">Description / Memo</label>
                <textarea 
                  rows={2}
                  placeholder="Brief details about this payment..."
                  value={newPayment.notes}
                  onChange={(e) => setNewPayment({ ...newPayment, notes: e.target.value })}
                  className="w-full bg-[#020617] border border-[#1f2937] rounded-xl px-4 py-3 text-sm font-medium text-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all resize-none"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-3 bg-[#111827] hover:bg-[#1f2937] text-[#9ca3af] font-bold rounded-xl transition-all text-sm border border-[#1f2937]"
                >
                  Discard
                </button>
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 px-4 py-3 bg-[#8b5cf6] hover:bg-[#7c3aed] disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-md text-sm flex items-center justify-center gap-2"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Finalize Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
