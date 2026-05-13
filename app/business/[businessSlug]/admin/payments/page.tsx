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
  Save,
  Eye,
  Upload,
  FileText,
  Paperclip
} from "lucide-react";
import toast from "react-hot-toast";
import clsx from "clsx";
import { useBusinessPayments, useBusinessCustomers } from "@/hooks/useAnalytics";
import { ChangeEvent } from "react";

export default function PaymentsPage() {
  const { data: paymentsData, isLoading: payLoading, refetch: fetchPayments } = useBusinessPayments();
  const { data: customersData, isLoading: custLoading } = useBusinessCustomers();

  const payments = paymentsData || [];
  const customers = customersData || [];
  const loading = payLoading || custLoading;
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingTxnId, setUploadingTxnId] = useState<string | null>(null);

  const [newPayment, setNewPayment] = useState({
    customerId: "",
    amount: 0,
    type: "cash",
    paymentType: "received",
    date: new Date().toISOString().split('T')[0],
    notes: "",
    receiptUrl: ""
  });
  const [uploading, setUploading] = useState(false);

  const fetchData = fetchPayments;

  const handleReceiptUploadForTxn = async (e: ChangeEvent<HTMLInputElement>, txnId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 5MB limit check
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      e.target.value = "";
      return;
    }

    setUploadingTxnId(txnId);
    const toastId = toast.loading("Uploading receipt...");

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64 = reader.result;
        // 1. Upload to Cloudinary
        const uploadRes = await fetch("/api/business/upload", {
          method: "POST",
          body: JSON.stringify({ file: base64, folder: "receipts" }),
        });

        if (!uploadRes.ok) {
          const data = await uploadRes.json();
          toast.error(data.details || data.error || "Upload failed", { id: toastId });
          setUploadingTxnId(null);
          return;
        }

        const { url } = await uploadRes.json();

        // 2. Patch transaction
        const patchRes = await fetch("/api/business/transactions", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transactionId: txnId, receiptUrl: url }),
        });

        if (patchRes.ok) {
          toast.success("Receipt attached successfully", { id: toastId });
          fetchData();
        } else {
          const data = await patchRes.json();
          toast.error(data.error || "Failed to attach receipt", { id: toastId });
        }
      };
    } catch (err: any) {
      toast.error(err.message || "Upload error", { id: toastId });
    } finally {
      setUploadingTxnId(null);
    }
  };

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
        setNewPayment({ ...newPayment, customerId: "", amount: 0, notes: "", receiptUrl: "" });
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

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      e.target.value = "";
      return;
    }

    setUploading(true);
    const toastId = toast.loading("Uploading receipt...");

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64 = reader.result;
        const res = await fetch("/api/business/upload", {
          method: "POST",
          body: JSON.stringify({ file: base64, folder: "receipts" }),
        });

        if (res.ok) {
          const { url } = await res.json();
          setNewPayment({ ...newPayment, receiptUrl: url });
          toast.success("Receipt uploaded", { id: toastId });
        } else {
          const data = await res.json();
          toast.error(data.details || data.error || "Upload failed", { id: toastId });
        }
      };
    } catch (err: any) {
      toast.error(err.message || "Upload error", { id: toastId });
    } finally {
      setUploading(false);
    }
  };

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
            <h4 className="text-2xl font-bold text-[#22c55e]">
              ₹{payments.reduce((s, p: any) => {
                const isReceived = p.transactionType === 'received' || (p.category === 'SALE' && p.transactionType === 'sent');
                const amt = p.category === 'SALE' ? (p.paidAmount || 0) : p.amount;
                return isReceived ? s + amt : s;
              }, 0).toLocaleString()}
            </h4>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#22c55e]/10 flex items-center justify-center group-hover:scale-110 transition-transform">
            <ArrowDownRight className="w-6 h-6 text-[#22c55e]" />
          </div>
        </div>
        <div className="p-6 rounded-2xl bg-[#0b1220] border border-[#1f2937] flex items-center justify-between shadow-sm group">
          <div>
            <p className="text-xs font-bold text-[#9ca3af] uppercase tracking-widest mb-1.5">Total Disbursements</p>
            <h4 className="text-2xl font-bold text-[#ef4444]">
              ₹{payments.reduce((s, p: any) => {
                const isPaid = p.transactionType === 'paid' || (p.category === 'SALE' && p.transactionType === 'received');
                const amt = p.category === 'SALE' ? (p.paidAmount || 0) : p.amount;
                return isPaid ? s + amt : s;
              }, 0).toLocaleString()}
            </h4>
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
                  <th className="px-6 py-5 text-sm font-semibold text-[#9ca3af] uppercase tracking-wide text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f2937]">
                {payments.map((payment: any) => {
                  const isSale = payment.category === 'SALE';
                  const displayAmount = isSale ? (payment.paidAmount || 0) : payment.amount;
                  const isReceived = payment.transactionType === 'received' || (isSale && payment.transactionType === 'sent');
                  
                  return (
                    <tr key={payment._id} className="hover:bg-[#8b5cf6]/5 transition-colors group border-b border-slate-800 last:border-0">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2 text-base font-semibold text-white">
                          <Calendar className="w-5 h-5 text-[#9ca3af]" />
                          {new Date(payment.date).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <p className="text-base font-semibold text-white group-hover:text-[#8b5cf6] transition-colors">{payment.customerId?.name || "Market Expense"}</p>
                        <p className="text-sm text-slate-400 font-medium max-w-xs truncate mt-0.5">
                          {isSale ? `Payment during sale: ${payment.items?.map((it:any)=>it.name).join(', ')}` : (payment.notes || "No notes")}
                        </p>
                      </td>
                      <td className="px-6 py-5">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-400">
                          <CreditCard className="w-5 h-5"/>
                          {isSale ? "Sale Split" : (payment.paymentMethod || "N/A")}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <p className={clsx(
                          "text-lg font-semibold",
                          isReceived ? "text-[#22c55e]" : "text-[#ef4444]"
                        )}>
                          {isReceived ? '+' : '-'}₹{displayAmount.toLocaleString()}
                        </p>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <span className={clsx(
                          "inline-flex items-center px-4 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider border",
                          isReceived ? "bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/20" : "bg-[#ef4444]/10 text-[#ef4444] border-[#ef4444]/20"
                        )}>
                          {isReceived ? 'received' : 'paid'}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        {(payment.receiptUrl || payment.fileUrl) ? (
                          <a 
                            href={payment.receiptUrl || payment.fileUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-2 inline-flex items-center justify-center bg-[#111827] border border-[#1f2937] text-[#9ca3af] hover:text-[#8b5cf6] hover:border-[#8b5cf6]/50 rounded-lg transition-all"
                            title="View Receipt"
                          >
                            <Eye className="w-5 h-5" />
                          </a>
                        ) : (
                          <label className="relative cursor-pointer p-2 inline-flex items-center justify-center gap-1.5 bg-[#111827] border border-dashed border-[#8b5cf6]/40 text-[#9ca3af] hover:text-[#8b5cf6] hover:border-[#8b5cf6] rounded-lg transition-all">
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              onChange={(e) => handleReceiptUploadForTxn(e, payment._id)}
                              disabled={uploadingTxnId === payment._id}
                            />
                            {uploadingTxnId === payment._id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Upload className="w-4 h-4" />
                            )}
                            <span className="text-[9px] font-bold uppercase tracking-widest">Attach</span>
                          </label>
                        )}
                      </td>
                    </tr>
                  );
                })}
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

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest block">Receipt / Proof (Max 5MB)</label>
                <div className="relative group">
                  <input 
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className={clsx(
                    "w-full bg-[#020617] border border-dashed rounded-xl px-4 py-4 flex flex-col items-center justify-center gap-2 transition-all",
                    newPayment.receiptUrl ? "border-[#22c55e] bg-[#22c55e]/5" : "border-[#1f2937] group-hover:border-[#8b5cf6]"
                  )}>
                    {newPayment.receiptUrl ? (
                      <>
                        <FileText className="w-6 h-6 text-[#22c55e]" />
                        <span className="text-xs font-bold text-[#22c55e]">Receipt Attached</span>
                      </>
                    ) : (
                      <>
                        <Paperclip className="w-6 h-6 text-[#6b7280]" />
                        <span className="text-xs font-bold text-[#6b7280]">Attach Payment Proof</span>
                      </>
                    )}
                  </div>
                </div>
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
