"use client";

import { useEffect, useState, useRef, useCallback, Fragment } from "react";
import { 
  Clock, 
  ShoppingBag, 
  CreditCard, 
  ArrowLeft, 
  IndianRupee,
  Loader2,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Trash2,
  Save,
  Package,
  History,
  Eye,
  Paperclip,
  FileText,
  Pencil,
  X
} from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import clsx from "clsx";

export default function CustomerDetailPage() {
  const params = useParams();
  // Normalize customerId — useParams can return string | string[] | undefined
  const rawCustomerId = params.customerId;
  const customerId = Array.isArray(rawCustomerId) ? rawCustomerId[0] : rawCustomerId;
  const businessSlug = params.businessSlug;

  const [customer, setCustomer] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[] | null>(null); // Start as null to distinguish from empty array
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  
  // New Sale State
  const [newSale, setNewSale] = useState({
    saleType: "sent",
    items: [{ name: "", qty: 1, price: 0 }],
    transportationCost: 0,
    paidAmount: 0,
    date: new Date().toISOString().split('T')[0],
    receiptUrl: ""
  });

  // New Payment State
  const [newPayment, setNewPayment] = useState({
    amount: 0,
    type: "cash",
    paymentType: "received",
    date: new Date().toISOString().split('T')[0],
    notes: "",
    receiptUrl: ""
  });
  const [uploading, setUploading] = useState(false);

  // Edit Customer Details
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ name: "", phone: "", businessName: "", gstNumber: "", address: "" });
  const [isEditSaving, setIsEditSaving] = useState(false);

  const router = useRouter();

  // Track fetch generation to prevent stale responses from overwriting fresh data
  const fetchGenRef = useRef(0);

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    // Guard: skip fetch if customerId is not available yet (hydration timing)
    if (!customerId) return;

    const currentGen = ++fetchGenRef.current;
    setLoading(true);

    const doFetch = async () => {
      // Cache-bust timestamp prevents any edge/CDN caching
      const ts = Date.now();
      const [custRes, transRes] = await Promise.all([
        fetch(`/api/business/customers/${customerId}?_t=${ts}`, {
          cache: "no-store",
          credentials: "include",
          signal,
        }),
        fetch(`/api/business/transactions?customerId=${customerId}&_t=${ts}`, {
          cache: "no-store",
          credentials: "include",
          signal,
        })
      ]);

      // Staleness check: if a newer fetch was started, discard this response
      if (currentGen !== fetchGenRef.current) return true; 

      if (custRes.ok) {
        setCustomer(await custRes.json());
      }

      if (transRes.ok) {
        const transJson = await transRes.json();
        const data = Array.isArray(transJson) ? transJson : (transJson.data || []);
        setTransactions(data);
        return true;
      }

      return false; // signal that transactions fetch failed
    };

    try {
      const success = await doFetch();
      // Retry once after a short delay on failure (handles cold-start / auth timing)
      if (success === false && currentGen === fetchGenRef.current) {
        await new Promise(r => setTimeout(r, 1000));
        if (currentGen === fetchGenRef.current) {
          await doFetch();
        }
      }
    } catch (err: any) {
      // Don't log abort errors — they're expected on cleanup
      if (err?.name !== "AbortError") {
        console.error(err);
      }
    } finally {
      // Only update state if this is still the latest fetch
      if (currentGen === fetchGenRef.current) {
        // CRITICAL: If transactions is still null after all attempts (API failure,
        // auth timing, network error), set it to [] so the UI never stays stuck
        // on "Loading ledger history..." forever.
        setTransactions(prev => prev === null ? [] : prev);
        setLoading(false);
      }
    }
  }, [customerId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'sale' | 'payment') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1MB limit check
    if (file.size > 1024 * 1024) {
      toast.error("File size must be less than 1MB");
      e.target.value = "";
      return;
    }

    setUploading(true);
    const toastId = toast.loading("Uploading receipt...");

    try {
      // Convert to base64
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
          if (type === 'sale') setNewSale({ ...newSale, receiptUrl: url });
          else setNewPayment({ ...newPayment, receiptUrl: url });
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

  useEffect(() => {
    // Don't fetch until customerId is available and valid
    if (!customerId || customerId === "undefined") return;

    const controller = new AbortController();
    fetchData(controller.signal);

    // Cleanup: abort in-flight request if customerId changes or component unmounts
    return () => controller.abort();
  }, [customerId, fetchData]);

  const addItem = () => {
    setNewSale({
      ...newSale,
      items: [...newSale.items, { name: "", qty: 1, price: 0 }]
    });
  };

  const removeItem = (index: number) => {
    const updated = [...newSale.items];
    updated.splice(index, 1);
    setNewSale({ ...newSale, items: updated });
  };

  const updateItem = (index: number, field: string, value: any) => {
    const updated: any = [...newSale.items];
    updated[index][field] = value;
    setNewSale({ ...newSale, items: updated });
  };

  const totalAmount = newSale.items.reduce((sum, item) => sum + (item.qty * item.price), 0) + Number(newSale.transportationCost);

  async function handleSaleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSaving) return;
    if (newSale.items.some(it => !it.name || it.price <= 0)) return toast.error("Please fill all item details");

    setIsSaving(true);
    try {
      const res = await fetch("/api/business/sales", {
        method: "POST",
        body: JSON.stringify({ ...newSale, customerId, totalAmount, paidAmount: newSale.paidAmount }),
      });
      if (res.ok) {
        toast.success("Sale recorded successfully");
        setShowSaleModal(false);
        setNewSale({
          saleType: "sent",
          items: [{ name: "", qty: 1, price: 0 }],
          transportationCost: 0,
          paidAmount: 0,
          date: new Date().toISOString().split('T')[0],
          receiptUrl: ""
        });
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.details || data.error || "Failed to record sale");
      }
    } catch (err) {
      toast.error("Network error");
    } finally {
      setIsSaving(false);
    }
  }

  async function handlePaymentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPayment.amount <= 0) return toast.error("Enter valid amount");

    setIsSaving(true);
    try {
      const res = await fetch("/api/business/payments", {
        method: "POST",
        body: JSON.stringify({ ...newPayment, customerId }),
      });
      if (res.ok) {
        toast.success("Payment recorded");
        setShowPaymentModal(false);
        setNewPayment({ ...newPayment, amount: 0, notes: "", receiptUrl: "" });
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.details || data.error || "Failed to save payment");
      }
    } catch (err) {
      toast.error("Network error");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleEditSave() {
    setIsEditSaving(true);
    try {
      const res = await fetch(`/api/business/customers/${customerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editData),
      });
      if (res.ok) {
        const updated = await res.json();
        setCustomer(updated);
        setIsEditing(false);
        toast.success("Customer details updated");
      } else {
        toast.error("Failed to update");
      }
    } catch (err) {
      toast.error("Network error");
    } finally {
      setIsEditSaving(false);
    }
  }

  function startEditing() {
    setEditData({
      name: customer?.name || "",
      phone: customer?.phone || "",
      businessName: customer?.businessName || "",
      gstNumber: customer?.gstNumber || "",
      address: customer?.address || "",
    });
    setIsEditing(true);
  }
  
  if (loading && !customer) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-[#8b5cf6] animate-spin" />
      </div>
    );
  }

  const history = transactions || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-7xl mx-auto">
      {/* Header / Back */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => router.back()}
          className="p-2.5 h-10 w-10 bg-[#0b1220] border border-[#1f2937] rounded-xl text-[#9ca3af] hover:text-[#f9fafb] hover:bg-[#111827] transition-all flex items-center justify-center shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-[#f9fafb] tracking-tight">{customer?.name}</h2>
          <p className="text-[#9ca3af] text-[10px] font-bold uppercase tracking-widest mt-0.5">{customer?.phone || "Private Account"}</p>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowSaleModal(true)}
            className="flex items-center gap-2 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md"
          >
            <ShoppingBag className="w-4 h-4" />
            Add Sale
          </button>
          <button 
            onClick={() => setShowPaymentModal(true)}
            className="flex items-center gap-2 bg-[#111827] border border-[#1f2937] hover:bg-[#1f2937] text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm"
          >
            <CreditCard className="w-4 h-4" />
            Add Payment
          </button>
        </div>
      </div>

      {/* Financial Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="p-5 rounded-2xl bg-[#0b1220] border border-[#1f2937] shadow-sm relative overflow-hidden group">
          <p className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest mb-1.5">Product Sent</p>
          <h3 className="text-xl font-bold text-[#ef4444]">₹{customer?.financials?.productSent?.toLocaleString() || 0}</h3>
          <ArrowUpRight className="absolute -bottom-2 -right-2 w-14 h-14 text-[#1f2937] group-hover:text-[#ef4444]/10 transition-colors" />
        </div>
        <div className="p-5 rounded-2xl bg-[#0b1220] border border-[#1f2937] shadow-sm relative overflow-hidden group">
          <p className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest mb-1.5">Product Received</p>
          <h3 className="text-xl font-bold text-[#38bdf8]">₹{customer?.financials?.productReceived?.toLocaleString() || 0}</h3>
          <ArrowDownRight className="absolute -bottom-2 -right-2 w-14 h-14 text-[#1f2937] group-hover:text-[#38bdf8]/10 transition-colors" />
        </div>
        <div className="p-5 rounded-2xl bg-[#0b1220] border border-[#1f2937] shadow-sm relative overflow-hidden group">
          <p className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest mb-1.5">Payment Received</p>
          <h3 className="text-xl font-bold text-[#22c55e]">₹{customer?.financials?.paymentReceived?.toLocaleString() || 0}</h3>
          <CreditCard className="absolute -bottom-2 -right-2 w-14 h-14 text-[#1f2937] group-hover:text-[#22c55e]/10 transition-colors" />
        </div>
        <div className="p-5 rounded-2xl bg-[#0b1220] border border-[#1f2937] shadow-sm relative overflow-hidden group">
          <p className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest mb-1.5">Payment Given</p>
          <h3 className="text-xl font-bold text-[#f59e0b]">₹{customer?.financials?.paymentGiven?.toLocaleString() || 0}</h3>
          <ArrowUpRight className="absolute -bottom-2 -right-2 w-14 h-14 text-[#1f2937] group-hover:text-[#f59e0b]/10 transition-colors" />
        </div>
        <div className="col-span-2 md:col-span-1 p-5 rounded-2xl bg-[#0b1220] border border-[#1f2937] shadow-sm relative overflow-hidden group">
          <p className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest mb-1.5">Current Balance</p>
          <h3 className={clsx("text-xl font-bold", 
            (customer?.financials?.currentBalance || 0) > 0 ? "text-[#ef4444]" : 
            (customer?.financials?.currentBalance || 0) < 0 ? "text-[#22c55e]" : "text-[#f9fafb]"
          )}>
            ₹{customer?.financials?.currentBalance?.toLocaleString() || 0}
          </h3>
          <IndianRupee className="absolute -bottom-2 -right-2 w-14 h-14 text-[#1f2937] group-hover:text-[#8b5cf6]/10 transition-colors" />
        </div>
      </div>

      {/* Customer Business Details Card */}
      <div className="bg-[#0b1220] border border-[#1f2937] rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[10px] font-bold text-[#ffd200] uppercase tracking-widest flex items-center gap-2">
            <span className="text-base">🏢</span> Business Details
          </h3>
          {!isEditing ? (
            <button
              onClick={startEditing}
              className="flex items-center gap-1.5 text-[10px] font-bold text-[#8b5cf6] hover:text-[#7c3aed] uppercase tracking-widest px-3 py-1.5 rounded-lg border border-[#8b5cf6]/30 bg-[#8b5cf6]/5 hover:bg-[#8b5cf6]/10 transition-all"
            >
              <Pencil className="w-3 h-3" /> Edit
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditing(false)}
                className="flex items-center gap-1 text-[10px] font-bold text-[#9ca3af] hover:text-[#f9fafb] uppercase tracking-widest px-3 py-1.5 rounded-lg border border-[#1f2937] bg-[#111827] hover:bg-[#1f2937] transition-all"
              >
                <X className="w-3 h-3" /> Cancel
              </button>
              <button
                onClick={handleEditSave}
                disabled={isEditSaving}
                className="flex items-center gap-1 text-[10px] font-bold text-white uppercase tracking-widest px-3 py-1.5 rounded-lg bg-[#8b5cf6] hover:bg-[#7c3aed] disabled:opacity-50 transition-all shadow-sm"
              >
                {isEditSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save
              </button>
            </div>
          )}
        </div>

        {isEditing ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest">Name</label>
              <input
                value={editData.name}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                className="w-full bg-[#020617] border border-[#1f2937] rounded-xl px-4 py-2.5 text-sm font-medium text-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest">Phone</label>
              <input
                value={editData.phone}
                onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                className="w-full bg-[#020617] border border-[#1f2937] rounded-xl px-4 py-2.5 text-sm font-medium text-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest">Business Name</label>
              <input
                value={editData.businessName}
                onChange={(e) => setEditData({ ...editData, businessName: e.target.value })}
                placeholder="Business / Company Name"
                className="w-full bg-[#020617] border border-[#1f2937] rounded-xl px-4 py-2.5 text-sm font-medium text-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all placeholder:text-[#374151]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest">GST Number</label>
              <input
                value={editData.gstNumber}
                onChange={(e) => setEditData({ ...editData, gstNumber: e.target.value })}
                placeholder="e.g. 36ACBPJ2699D2ZM"
                className="w-full bg-[#020617] border border-[#1f2937] rounded-xl px-4 py-2.5 text-sm font-medium text-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all placeholder:text-[#374151]"
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest">Address</label>
              <textarea
                rows={2}
                value={editData.address}
                onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                placeholder="Full address including city, state, pincode"
                className="w-full bg-[#020617] border border-[#1f2937] rounded-xl px-4 py-2.5 text-sm font-medium text-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all resize-none placeholder:text-[#374151]"
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
            <div>
              <p className="text-[10px] font-bold text-[#6b7280] uppercase tracking-widest">Business Name</p>
              <p className="text-sm font-medium text-[#f9fafb] mt-0.5">{customer?.businessName || <span className="text-[#374151] italic">Not set</span>}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-[#6b7280] uppercase tracking-widest">GST Number</p>
              <p className="text-sm font-medium text-[#f9fafb] mt-0.5">{customer?.gstNumber || <span className="text-[#374151] italic">Not set</span>}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-[10px] font-bold text-[#6b7280] uppercase tracking-widest">Address</p>
              <p className="text-sm font-medium text-[#f9fafb] mt-0.5">{customer?.address || <span className="text-[#374151] italic">Not set</span>}</p>
            </div>
          </div>
        )}
      </div>

      {/* Combined Ledger */}
      <div className="bg-[#0b1220] border border-[#1f2937] rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-[#1f2937] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#8b5cf6]" />
            <h3 className="text-sm font-bold text-[#f9fafb] uppercase tracking-widest">Account Ledger</h3>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-max">
            <thead>
              <tr className="bg-[#0b1220] border-b border-[#1f2937]">
                <th className="px-6 py-5 text-sm font-semibold text-[#9ca3af] uppercase tracking-wide">Date</th>
                <th className="px-6 py-5 text-sm font-semibold text-[#9ca3af] uppercase tracking-wide">Type</th>
                <th className="px-6 py-5 text-sm font-semibold text-[#9ca3af] uppercase tracking-wide">Product Name</th>
                <th className="px-6 py-5 text-sm font-semibold text-[#9ca3af] uppercase tracking-wide text-right">Qty</th>
                <th className="px-6 py-5 text-sm font-semibold text-[#9ca3af] uppercase tracking-wide text-right">Price</th>
                <th className="px-6 py-5 text-sm font-semibold text-[#9ca3af] uppercase tracking-wide text-right">Transportation</th>
                <th className="px-6 py-5 text-sm font-semibold text-[#9ca3af] uppercase tracking-wide text-right">Total Price</th>
                <th className="px-6 py-5 text-sm font-semibold text-[#9ca3af] uppercase tracking-wide text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f2937]">
              {transactions === null ? (
                <tr>
                  <td colSpan={8} className="px-6 py-24 text-center">
                    <Loader2 className="w-6 h-6 text-[#8b5cf6] animate-spin mx-auto mb-2" />
                    <p className="text-xs text-[#9ca3af] font-bold uppercase tracking-widest">Loading ledger history...</p>
                  </td>
                </tr>
              ) : history.length > 0 ? history.map((entry: any, i) => {
                const isSale = entry.category === 'SALE';
                const isSent = entry.transactionType === 'sent';
                const items = entry.items || [];
                return (
                  <Fragment key={i}>
                    {isSale ? (
                      <>
                        {/* First item row with date, type, transport, total, receipt */}
                        <tr className={clsx(
                          "transition-colors group border-b border-slate-800 last:border-0",
                          isSent ? "hover:bg-[#ef4444]/5" : "hover:bg-[#38bdf8]/5"
                        )}>
                          <td className="px-6 py-5" rowSpan={Math.max(items.length, 1)}>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-5 h-5 text-[#9ca3af]" />
                              <p className="text-base font-semibold text-white">{new Date(entry.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}</p>
                            </div>
                          </td>
                          <td className="px-6 py-5" rowSpan={Math.max(items.length, 1)}>
                            <span className={clsx(
                              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider border",
                              isSent 
                                ? "bg-[#ef4444]/10 text-[#ef4444] border-[#ef4444]/20" 
                                : "bg-[#38bdf8]/10 text-[#38bdf8] border-[#38bdf8]/20"
                            )}>
                              {isSent ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                              {isSent ? 'Sent' : 'Received'}
                            </span>
                          </td>
                          {/* First item */}
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <div className={clsx(
                                "w-10 h-10 rounded-xl flex items-center justify-center transition-all bg-[#020617] border border-[#1f2937]",
                                isSent ? "text-[#ef4444]" : "text-[#38bdf8]"
                              )}>
                                <ShoppingBag className="w-4 h-4" />
                              </div>
                              <p className="text-base font-semibold text-white">{items[0]?.name || 'Product'}</p>
                            </div>
                          </td>
                          <td className="px-6 py-5 text-right font-medium text-base text-white">
                            {items[0]?.qty || ''}
                          </td>
                          <td className="px-6 py-5 text-right font-medium text-base text-white">
                            {items[0]?.price ? `₹${items[0].price.toLocaleString()}` : ''}
                          </td>
                          <td className="px-6 py-5 text-right font-medium text-base text-[#9ca3af]" rowSpan={Math.max(items.length, 1)}>
                            {entry.transportationCost ? `₹${entry.transportationCost.toLocaleString()}` : '—'}
                          </td>
                          <td className={clsx(
                            "px-6 py-5 text-right font-semibold text-lg",
                            isSent ? "text-[#ef4444]" : "text-[#38bdf8]"
                          )} rowSpan={Math.max(items.length, 1)}>
                            ₹{entry.amount.toLocaleString()}
                          </td>
                          <td className="px-6 py-5 text-right" rowSpan={Math.max(items.length, 1)}>
                            {entry.receiptUrl ? (
                              <a 
                                href={entry.receiptUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="p-2 inline-flex items-center justify-center bg-[#111827] border border-[#1f2937] text-[#9ca3af] hover:text-[#8b5cf6] hover:border-[#8b5cf6]/50 rounded-lg transition-all"
                                title="View Receipt"
                              >
                                <Eye className="w-5 h-5" />
                              </a>
                            ) : (
                              <span className="text-[10px] font-bold text-[#1f2937] uppercase tracking-widest">No File</span>
                            )}
                          </td>
                        </tr>
                        {/* Additional item rows (2nd item onwards) */}
                        {items.slice(1).map((item: any, j: number) => (
                          <tr key={`${i}-item-${j}`} className={clsx(
                            "transition-colors border-b border-slate-800/50 last:border-0",
                            isSent ? "hover:bg-[#ef4444]/5" : "hover:bg-[#38bdf8]/5"
                          )}>
                            <td className="px-6 py-3">
                              <div className="flex items-center gap-3 pl-[52px]">
                                <p className="text-base font-semibold text-white">{item.name}</p>
                              </div>
                            </td>
                            <td className="px-6 py-3 text-right font-medium text-base text-white">
                              {item.qty}
                            </td>
                            <td className="px-6 py-3 text-right font-medium text-base text-white">
                              ₹{item.price.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </>
                    ) : (
                      /* Payment row */
                      <tr className="bg-[#00ff00]/35 hover:bg-[#00ff00]/45 transition-colors border-b border-slate-800 last:border-0">
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-[#9ca3af]" />
                            <p className="text-base font-semibold text-white">{new Date(entry.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}</p>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className={clsx(
                            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider border",
                            entry.transactionType === 'received'
                              ? "bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/20"
                              : "bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/20"
                          )}>
                            <CreditCard className="w-3.5 h-3.5" />
                            {entry.transactionType === 'received' ? 'Received' : 'Given'}
                          </span>
                        </td>
                        <td colSpan={4} className="px-6 py-5 text-center">
                          <p className="text-lg font-bold text-white uppercase tracking-widest">
                            ₹{entry.amount.toLocaleString()} {entry.transactionType === 'received' ? 'payment received from customer' : 'payment sent to customer'}
                          </p>
                          {entry.notes && (
                            <p className="text-xs font-medium text-slate-300 mt-1 opacity-80">{entry.notes}</p>
                          )}
                        </td>
                        <td className="px-6 py-5 text-right">
                          {entry.receiptUrl ? (
                            <a 
                              href={entry.receiptUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="p-2 inline-flex items-center justify-center bg-[#111827] border border-[#1f2937] text-[#9ca3af] hover:text-[#8b5cf6] hover:border-[#8b5cf6]/50 rounded-lg transition-all"
                              title="View Receipt"
                            >
                              <Eye className="w-5 h-5" />
                            </a>
                          ) : (
                            <span className="text-[10px] font-bold text-[#1f2937] uppercase tracking-widest">No File</span>
                          )}
                        </td>
                      </tr>
                    )}
                    {/* Inline payment during sale */}
                    {isSale && entry.paidAmount > 0 && (
                      <tr className={clsx(
                        "transition-colors group border-b border-slate-800 last:border-0",
                        isSent ? "bg-[#00ff00]/35 hover:bg-[#00ff00]/45" : "bg-[#f59e0b]/20 hover:bg-[#f59e0b]/30"
                      )}>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-[#9ca3af]" />
                            <p className="text-base font-semibold text-white">{new Date(entry.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}</p>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className={clsx(
                            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider border",
                            isSent 
                              ? "bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/20"
                              : "bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/20"
                          )}>
                            <CreditCard className="w-3.5 h-3.5" />
                            {isSent ? 'Received' : 'Given'}
                          </span>
                        </td>
                        <td colSpan={4} className="px-6 py-5 text-center">
                          <p className="text-lg font-bold text-white uppercase tracking-widest">
                            ₹{entry.paidAmount.toLocaleString()} {isSent ? 'payment received during sale' : 'payment given during purchase'}
                          </p>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <span className="text-[10px] font-bold text-[#1f2937] uppercase tracking-widest">Included Above</span>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              }) : (
                <tr>
                  <td colSpan={8} className="px-6 py-24 text-center">
                    <p className="text-xs text-[#9ca3af] font-bold uppercase tracking-widest">No transaction history found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Sale Modal */}
      {showSaleModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 duration-300" onClick={() => setShowSaleModal(false)} />
          <div className="relative bg-[#0b1220] border border-[#1f2937] w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-[#1f2937] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-[#f9fafb]">Record Sale</h3>
                <p className="text-[10px] text-[#8b5cf6] font-bold uppercase tracking-widest mt-1">New purchase for {customer?.name}</p>
              </div>
              <button onClick={() => setShowSaleModal(false)} className="text-[#9ca3af] hover:text-[#f9fafb] transition-colors p-1 bg-[#111827] rounded-lg border border-[#1f2937]">
                <Plus className="w-4 h-4 rotate-45" />
              </button>
            </div>
            
            <form onSubmit={handleSaleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-[#0b1220]">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest">Record Target</label>
                  <select 
                    value={newSale.saleType}
                    onChange={(e) => setNewSale({ ...newSale, saleType: e.target.value })}
                    className="w-full bg-[#020617] border border-[#1f2937] rounded-xl px-4 py-3 text-sm text-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] appearance-none transition-all cursor-pointer font-medium"
                  >
                    <option value="sent">Product Sent (Customer Pays)</option>
                    <option value="received">Product Received (Admin Pays)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest">Sale Date</label>
                  <input 
                    type="date"
                    value={newSale.date}
                    onChange={(e) => setNewSale({ ...newSale, date: e.target.value })}
                    className="w-full bg-[#020617] border border-[#1f2937] rounded-xl px-4 py-2.5 text-sm font-medium text-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all [color-scheme:dark]"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-[#1f2937] pb-3">
                  <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest">Items Sold</label>
                  <button 
                    type="button"
                    onClick={addItem}
                    className="text-[10px] font-bold text-[#8b5cf6] hover:text-[#7c3aed] uppercase tracking-widest flex items-center gap-1 bg-[#8b5cf6]/5 px-3 py-1.5 rounded-lg border border-[#8b5cf6]/20 transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Add Item
                  </button>
                </div>
                
                {newSale.items.map((item, index) => (
                  <div key={index} className="p-5 rounded-xl bg-[#020617] border border-[#1f2937] space-y-4 relative group">
                    <button 
                      type="button"
                      onClick={() => removeItem(index)}
                      disabled={newSale.items.length === 1}
                      className="absolute top-4 right-4 p-2 text-[#6b7280] hover:text-[#ef4444] hover:bg-[#ef4444]/10 rounded-lg transition-all disabled:opacity-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest block">Product Name</label>
                      <input 
                        required
                        placeholder="Item Name (e.g. Chlorine, Filter)"
                        value={item.name}
                        onChange={(e) => updateItem(index, 'name', e.target.value)}
                        className="w-full bg-[#0b1220] border border-[#1f2937] rounded-xl px-4 py-3 text-sm text-[#f9fafb] font-medium focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest block">Quantity</label>
                        <input 
                          required
                          type="number"
                          placeholder="0"
                          value={item.qty}
                          onChange={(e) => updateItem(index, 'qty', Number(e.target.value))}
                          className="w-full bg-[#0b1220] border border-[#1f2937] rounded-xl px-4 py-3 text-sm text-[#f9fafb] font-bold focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest block">Price per Unit (₹)</label>
                        <input 
                          required
                          type="number"
                          placeholder="0.00"
                          value={item.price}
                          onChange={(e) => updateItem(index, 'price', Number(e.target.value))}
                          className="w-full bg-[#0b1220] border border-[#1f2937] rounded-xl px-4 py-3 text-sm text-[#f9fafb] font-bold focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest block">Transportation (₹)</label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280]" />
                    <input 
                      type="number"
                      value={newSale.transportationCost || ""}
                      onChange={(e) => setNewSale({ ...newSale, transportationCost: Number(e.target.value) })}
                      className="w-full bg-[#020617] border border-[#1f2937] rounded-xl pl-9 pr-4 py-2.5 text-sm font-bold text-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest block">
                    {newSale.saleType === "sent" ? "Amount Paid by Customer (₹)" : "Amount Paid to Customer (₹)"}
                  </label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#22c55e]" />
                    <input 
                      type="number"
                      placeholder="0"
                      value={newSale.paidAmount || ""}
                      onChange={(e) => setNewSale({ ...newSale, paidAmount: Number(e.target.value) })}
                      className="w-full bg-[#020617] border border-[#1f2937] rounded-xl pl-9 pr-4 py-2.5 text-sm font-bold text-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest block">Receipt / Bill Attachment (Max 1MB)</label>
                <div className="relative group">
                  <input 
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => handleFileUpload(e, 'sale')}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className={clsx(
                    "w-full bg-[#020617] border border-dashed rounded-xl px-4 py-4 flex flex-col items-center justify-center gap-2 transition-all",
                    newSale.receiptUrl ? "border-[#22c55e] bg-[#22c55e]/5" : "border-[#1f2937] group-hover:border-[#8b5cf6]"
                  )}>
                    {newSale.receiptUrl ? (
                      <>
                        <FileText className="w-6 h-6 text-[#22c55e]" />
                        <span className="text-xs font-bold text-[#22c55e]">File Attached Successfully</span>
                      </>
                    ) : (
                      <>
                        <Paperclip className="w-6 h-6 text-[#6b7280]" />
                        <span className="text-xs font-bold text-[#6b7280]">Click or Drag to Upload Receipt</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </form>

            <div className="px-6 py-5 bg-[#0b1220] border-t border-[#1f2937] flex items-center justify-between sticky bottom-0">
              <div>
                <p className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest mb-1.5">Total Payable</p>
                <h4 className="text-xl font-bold text-[#f9fafb]">₹{totalAmount.toLocaleString()}</h4>
              </div>
              <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={() => setShowSaleModal(false)}
                  className="px-5 py-2.5 bg-[#111827] hover:bg-[#1f2937] text-[#9ca3af] font-bold rounded-xl transition-all text-xs border border-[#1f2937]"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaleSubmit}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-[#8b5cf6] hover:bg-[#7c3aed] disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-md text-xs"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Commit Record
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 duration-300" onClick={() => setShowPaymentModal(false)} />
          <div className="relative bg-[#0b1220] border border-[#1f2937] w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#1f2937] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-[#f9fafb]">Record Payment</h3>
                <p className="text-[10px] text-[#22c55e] font-bold uppercase tracking-widest mt-1">Settlement from {customer?.name}</p>
              </div>
              <button onClick={() => setShowPaymentModal(false)} className="text-[#9ca3af] hover:text-[#f9fafb] transition-colors p-1 bg-[#111827] rounded-lg border border-[#1f2937]">
                <Plus className="w-4 h-4 rotate-45" />
              </button>
            </div>
            <form onSubmit={handlePaymentSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest block">Entry Amount</label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#22c55e]" />
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
                    className="w-full bg-[#020617] border border-[#1f2937] rounded-xl px-4 py-2.5 text-sm font-medium text-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] appearance-none transition-all"
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
                  className="w-full bg-[#020617] border border-[#1f2937] rounded-xl px-4 py-2.5 text-sm font-medium text-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest block">Receipt / Proof (Max 1MB)</label>
                <div className="relative group">
                  <input 
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => handleFileUpload(e, 'payment')}
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
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 px-4 py-2.5 bg-[#111827] hover:bg-[#1f2937] text-[#9ca3af] font-bold rounded-xl transition-all text-sm border border-[#1f2937]"
                >
                  Discard
                </button>
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 px-4 py-2.5 bg-[#8b5cf6] hover:bg-[#7c3aed] disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-md text-sm flex items-center justify-center gap-2"
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
