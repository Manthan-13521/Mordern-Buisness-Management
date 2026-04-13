"use client";

import { useEffect, useState } from "react";
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  IndianRupee, 
  ChevronRight,
  ArrowUpRight,
  ArrowDownLeft,
  Loader2,
  ShoppingBag,
  CreditCard,
  Save,
  Trash2,
  CheckCircle2,
  Package
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import toast from "react-hot-toast";
import clsx from "clsx";

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all"); 
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "", businessName: "", gstNumber: "", address: "" });
  const [isSaving, setIsSaving] = useState(false);

  // Transaction Modal
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [transactionType, setTransactionType] = useState<"receive" | "give">("receive");

  const [transactionData, setTransactionData] = useState({
    amount: 0,
    type: "cash",
    notes: "",
    date: new Date().toISOString().split('T')[0],
    items: [{ name: "", qty: 1, price: 0 }],
    transportationCost: 0
  });

  const pathname = usePathname();
  const match = pathname.match(/^\/business\/([^/]+)\/admin/);
  const businessSlug = match?.[1] ?? "";

  async function fetchCustomers() {
    try {
      const url = `/api/business/customers${tab === "due" ? "?hasDue=true" : ""}`;
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();
      setCustomers(data);
    } catch (err) {
      toast.error("Failed to load customers");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCustomers();
  }, [tab]);

  const filteredCustomers = customers.filter((c: any) => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.phone?.includes(search)
  );

  async function handleAddCustomer(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch("/api/business/customers", {
        method: "POST",
        body: JSON.stringify(newCustomer),
      });
      if (res.ok) {
        toast.success("Customer added");
        setShowAddModal(false);
        setNewCustomer({ name: "", phone: "", businessName: "", gstNumber: "", address: "" });
        fetchCustomers();
      } else {
        toast.error("Failed to add customer");
      }
    } catch (err) {
      toast.error("Error adding customer");
    } finally {
      setIsSaving(false);
    }
  }

  const addItem = () => {
    setTransactionData({
      ...transactionData,
      items: [...transactionData.items, { name: "", qty: 1, price: 0 }]
    });
  };

  const removeItem = (index: number) => {
    const updated = [...transactionData.items];
    updated.splice(index, 1);
    setTransactionData({ ...transactionData, items: updated });
  };

  const updateItem = (index: number, field: string, value: any) => {
    const updated: any = [...transactionData.items];
    updated[index][field] = value;
    setTransactionData({ ...transactionData, items: updated });
  };

  const totalSaleAmount = transactionData.items.reduce((sum, item) => sum + (item.qty * item.price), 0) + Number(transactionData.transportationCost);

  async function handleTransactionSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCustomer) return;
    setIsSaving(true);

    try {
      if (transactionType === "give") {
        if (transactionData.items.some(it => !it.name || it.price <= 0)) {
          toast.error("Please fill all item details");
          setIsSaving(false);
          return;
        }
        const res = await fetch("/api/business/sales", {
          method: "POST",
          body: JSON.stringify({ 
            ...transactionData, 
            totalAmount: totalSaleAmount,
            saleType: "sent",
            customerId: selectedCustomer._id 
          }),
        });
        if (res.ok) {
          toast.success("Transaction recorded");
          closeModal();
          fetchCustomers();
        } else {
          const data = await res.json();
          toast.error(data.details || data.error || "Failed");
        }
      } else {
        if (transactionData.amount <= 0) {
          toast.error("Enter valid amount");
          setIsSaving(false);
          return;
        }
        const res = await fetch("/api/business/payments", {
          method: "POST",
          body: JSON.stringify({ 
            amount: transactionData.amount,
            type: transactionData.type,
            paymentType: "received",
            date: transactionData.date,
            notes: transactionData.notes,
            customerId: selectedCustomer._id 
          }),
        });
        if (res.ok) {
          toast.success("Payment received");
          closeModal();
          fetchCustomers();
        } else {
          const data = await res.json();
          toast.error(data.details || data.error || "Failed");
        }
      }
    } catch (err) {
      toast.error("Network error");
    } finally {
      setIsSaving(false);
    }
  }

  function closeModal() {
    setShowTransactionModal(false);
    setTransactionData({
      amount: 0,
      type: "cash",
      notes: "",
      date: new Date().toISOString().split('T')[0],
      items: [{ name: "", qty: 1, price: 0 }],
      transportationCost: 0
    });
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0b1220] p-6 rounded-2xl border border-[#1f2937] shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-[#f9fafb] tracking-tight">Customers</h2>
          <p className="text-[#9ca3af] text-sm mt-1 font-medium">Manage accounts, record transactions and monitor balances.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white px-7 py-3.5 rounded-xl font-bold text-base transition-all shadow-md"
        >
          <Plus className="w-5 h-5" />
          New Customer
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="flex-1 relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280]" />
          <input 
            type="text"
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#020617] border border-[#1f2937] rounded-xl pl-12 pr-4 py-3.5 text-sm text-[#f9fafb] placeholder:text-[#6b7280] font-medium focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all shadow-sm"
          />
        </div>
        <div className="flex bg-[#020617] p-1.5 rounded-xl border border-[#1f2937] w-full md:w-auto shadow-sm">
          <button 
            onClick={() => setTab("all")}
            className={clsx(
              "flex-1 md:flex-none px-6 py-2.5 rounded-lg text-xs font-bold transition-all",
              tab === "all" ? "bg-[#1f2937] text-[#f9fafb] shadow-sm" : "text-[#9ca3af] hover:text-[#f9fafb]"
            )}
          >
            All Profiles
          </button>
          <button 
            onClick={() => setTab("due")}
            className={clsx(
              "flex-1 md:flex-none px-6 py-2.5 rounded-lg text-xs font-bold transition-all",
              tab === "due" ? "bg-[#ef4444]/20 text-[#ef4444] shadow-sm border border-[#ef4444]/30" : "text-[#9ca3af] hover:text-[#ef4444]"
            )}
          >
            Has Dues
          </button>
        </div>
      </div>

      {/* Premium SaaS Table */}
      <div className="bg-[#0b1220] border border-[#1f2937] rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-8 h-8 text-[#8b5cf6] animate-spin" />
          </div>
        ) : filteredCustomers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap min-w-max">
              <thead>
                <tr className="bg-[#0b1220] border-b border-[#1f2937]">
                  <th className="px-6 py-5 text-sm font-semibold text-[#9ca3af] uppercase tracking-wide">Customer</th>
                  <th className="px-6 py-5 text-sm font-semibold text-[#9ca3af] uppercase tracking-wide text-right">Total Purchase</th>
                  <th className="px-6 py-5 text-sm font-semibold text-[#9ca3af] uppercase tracking-wide text-right">Total Paid</th>
                  <th className="px-6 py-5 text-sm font-semibold text-[#9ca3af] uppercase tracking-wide text-right">Due</th>
                  <th className="px-6 py-5 text-sm font-semibold text-[#9ca3af] uppercase tracking-wide">Activity</th>
                  <th className="px-6 py-5 text-sm font-semibold text-[#9ca3af] uppercase tracking-wide text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f2937]">
                {filteredCustomers.map((customer: any) => {
                  const isDue = customer.currentDue > 0;
                  const isPaidUp = customer.currentDue === 0 && customer.totalPurchase > 0;
                  
                  // Activity Logic
                  let latestActivity = "No activity";
                  if (customer.lastPayment && customer.lastSale) {
                    if (new Date(customer.lastPayment.date) >= new Date(customer.lastSale.date)) {
                      latestActivity = `Paid ₹${customer.lastPayment.amount}`;
                    } else {
                      latestActivity = `Bought ${customer.lastSale.items?.[0]?.name || 'items'}`;
                    }
                  } else if (customer.lastPayment) {
                    latestActivity = `Paid ₹${customer.lastPayment.amount}`;
                  } else if (customer.lastSale) {
                    latestActivity = `Bought ${customer.lastSale.items?.[0]?.name || 'items'}`;
                  }

                  return (
                    <tr key={customer._id} className="transition-all duration-200 group hover:bg-[#8b5cf6]/5 border-b border-slate-800 last:border-0">
                      <td className="px-6 py-[53px]">
                        <div className="flex items-center gap-4">
                          <div className={clsx(
                            "w-12 h-12 rounded-full flex items-center justify-center font-bold shadow-sm border border-[#1f2937] text-lg",
                            isDue ? "bg-[#020617] text-[#ef4444]" : "bg-[#0b1220] text-[#f9fafb]"
                          )}>
                            {customer.name[0]}
                          </div>
                          <div>
                            <p className="text-[1.2rem] font-semibold text-white group-hover:text-[#8b5cf6] transition-colors">{customer.name}</p>
                            <p className="text-[1.05rem] text-slate-400 mt-0.5">{customer.phone || "No phone"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-[53px] text-right">
                        <p className="text-[1.35rem] font-semibold text-white">₹{customer.totalPurchase.toLocaleString()}</p>
                      </td>
                      <td className="px-6 py-[53px] text-right">
                        <p className="text-[1.35rem] font-semibold text-[#22c55e]">₹{customer.totalPaid.toLocaleString()}</p>
                      </td>
                      <td className="px-6 py-[53px] text-right">
                        <p className={clsx(
                          "text-[1.35rem] font-semibold inline-flex rounded-lg",
                          isDue ? "text-[#ef4444]" : "text-[#9ca3af]"
                        )}>
                          ₹{customer.currentDue.toLocaleString()}
                        </p>
                      </td>
                      <td className="px-6 py-[53px]">
                        <span className={clsx(
                          "inline-flex items-center px-4 py-1.5 rounded-md text-[0.9rem] font-semibold uppercase tracking-wider border",
                          latestActivity.startsWith('Paid') ? "bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/20" :
                          latestActivity.startsWith('Bought') ? "bg-[#38bdf8]/10 text-[#38bdf8] border-[#38bdf8]/20" :
                          "bg-[#111827] text-[#9ca3af] border-[#1f2937]"
                        )}>
                          {latestActivity}
                        </span>
                      </td>
                      <td className="px-6 py-[53px] text-right">
                        <div className="flex items-center justify-end gap-3">
                          <Link 
                            href={`/business/${businessSlug}/admin/customers/${customer._id}`}
                            className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white text-sm font-bold rounded-lg transition-all shadow-sm"
                          >
                            <span className="text-[1.05rem]">Details</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 text-center relative overflow-hidden bg-[#0b1220]">
            <div className="w-16 h-16 bg-[#111827] rounded-2xl flex items-center justify-center mb-6 border border-[#1f2937]">
              <Users className="w-8 h-8 text-[#6b7280]" />
            </div>
            <h4 className="text-[#f9fafb] font-bold text-lg tracking-tight mb-2">No customers found</h4>
            <p className="text-[#9ca3af] text-sm max-w-sm mx-auto font-medium">Get started by creating your first customer profile or adjusting your search filters.</p>
          </div>
        )}
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-[#0b1220] border border-[#1f2937] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-[#1f2937] flex items-center justify-between">
              <h3 className="font-bold text-[#f9fafb] tracking-tight">New Customer</h3>
              <button onClick={() => setShowAddModal(false)} className="text-[#9ca3af] hover:text-[#f9fafb] transition-colors p-1 bg-[#111827] rounded-lg border border-[#1f2937]">
                <Plus className="w-4 h-4 rotate-45" />
              </button>
            </div>
            <form onSubmit={handleAddCustomer} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest block">Full Name *</label>
                <input 
                  autoFocus
                  required
                  type="text"
                  placeholder="e.g. Ramesh Singh"
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  className="w-full bg-[#020617] border border-[#1f2937] rounded-xl px-4 py-3 text-sm text-[#f9fafb] placeholder:text-[#6b7280] font-medium focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest block">Phone Number <span className="opacity-50">(Optional)</span></label>
                <input 
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  className="w-full bg-[#020617] border border-[#1f2937] rounded-xl px-4 py-3 text-sm text-[#f9fafb] placeholder:text-[#6b7280] font-medium focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all"
                />
              </div>

              {/* Business Details Section */}
              <div className="border-t border-[#1f2937] pt-4 mt-2">
                <p className="text-[10px] font-bold text-[#ffd200] uppercase tracking-widest mb-3 flex items-center gap-1.5">🏢 Business Details <span className="text-[#6b7280]">(Optional)</span></p>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest block">Business Name</label>
                    <input 
                      type="text"
                      placeholder="e.g. Singh Traders Pvt Ltd"
                      value={newCustomer.businessName}
                      onChange={(e) => setNewCustomer({ ...newCustomer, businessName: e.target.value })}
                      className="w-full bg-[#020617] border border-[#1f2937] rounded-xl px-4 py-3 text-sm text-[#f9fafb] placeholder:text-[#6b7280] font-medium focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest block">GST Number</label>
                    <input 
                      type="text"
                      placeholder="e.g. 36ACBPJ2699D2ZM"
                      value={newCustomer.gstNumber}
                      onChange={(e) => setNewCustomer({ ...newCustomer, gstNumber: e.target.value })}
                      className="w-full bg-[#020617] border border-[#1f2937] rounded-xl px-4 py-3 text-sm text-[#f9fafb] placeholder:text-[#6b7280] font-medium focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest block">Address</label>
                    <textarea 
                      rows={2}
                      placeholder="Full address including city, state, pincode"
                      value={newCustomer.address}
                      onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                      className="w-full bg-[#020617] border border-[#1f2937] rounded-xl px-4 py-3 text-sm text-[#f9fafb] placeholder:text-[#6b7280] font-medium focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all resize-none"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex gap-4">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-3 bg-[#111827] hover:bg-[#1f2937] text-[#9ca3af] font-bold rounded-xl transition-all text-sm border border-[#1f2937]"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="flex-[2] px-4 py-3 bg-[#8b5cf6] hover:bg-[#7c3aed] disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-md text-sm flex items-center justify-center gap-2"
                >
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Transaction Modal */}
      {showTransactionModal && selectedCustomer && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={closeModal} />
          <div className="relative bg-[#0b1220] border border-[#1f2937] w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 border-b border-[#1f2937] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-[#f9fafb] tracking-tight">Record Transaction</h3>
                <p className="text-[10px] text-[#9ca3af] mt-1 uppercase tracking-widest font-semibold">Account: <span className="text-[#8b5cf6]">{selectedCustomer.name}</span></p>
              </div>
              <button onClick={closeModal} className="text-[#9ca3af] hover:text-[#f9fafb] transition-colors p-1 bg-[#111827] rounded-lg border border-[#1f2937]">
                <Plus className="w-4 h-4 rotate-45" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar bg-[#0b1220]">
              <form id="transaction-form" onSubmit={handleTransactionSubmit} className="space-y-6">
                
                {/* Type and Date Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest block">Transaction Type</label>
                    <div className="relative">
                      <select
                        value={transactionType}
                        onChange={(e: any) => setTransactionType(e.target.value)}
                        className="w-full bg-[#020617] border border-[#1f2937] rounded-xl px-4 py-3 text-sm text-[#f9fafb] font-bold focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all appearance-none cursor-pointer"
                      >
                        <option value="receive">Receive from Customer</option>
                        <option value="give">Give to Customer</option>
                      </select>
                      <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280] pointer-events-none rotate-90" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest block">Date</label>
                    <input 
                      type="date"
                      value={transactionData.date}
                      onChange={(e) => setTransactionData({ ...transactionData, date: e.target.value })}
                      className="w-full bg-[#020617] border border-[#1f2937] rounded-xl px-4 py-3 text-sm text-[#f9fafb] font-semibold focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all [color-scheme:dark]"
                    />
                  </div>
                </div>

                {transactionType === "receive" ? (
                  // INCOME / PAYMENT FORM
                  <div className="space-y-6 animate-in duration-300">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest block">Amount Received</label>
                      <div className="relative">
                        <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#22c55e]" />
                        <input 
                          required
                          type="number"
                          placeholder="0.00"
                          value={transactionData.amount || ""}
                          onChange={(e) => setTransactionData({ ...transactionData, amount: Number(e.target.value) })}
                          className="w-full bg-[#020617] border border-[#1f2937] rounded-xl pl-12 pr-6 py-4 text-xl font-bold text-[#f9fafb] placeholder:text-[#1f2937] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest block">Payment Method</label>
                        <select 
                          value={transactionData.type}
                          onChange={(e: any) => setTransactionData({ ...transactionData, type: e.target.value })}
                          className="w-full bg-[#020617] border border-[#1f2937] rounded-xl px-4 py-3 text-sm font-bold text-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]"
                        >
                          <option value="cash">Cash</option>
                          <option value="upi">UPI / Bank Transfer</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest block">Notes (Optional)</label>
                        <input 
                          placeholder="e.g. Cleared dues"
                          value={transactionData.notes}
                          onChange={(e) => setTransactionData({ ...transactionData, notes: e.target.value })}
                          className="w-full bg-[#020617] border border-[#1f2937] rounded-xl px-4 py-3 text-sm font-semibold text-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  // EXPENSE / SALE FORM
                  <div className="space-y-6 animate-in duration-300">
                    <div className="space-y-4">
                      
                      <div className="flex items-center justify-between border-b border-[#1f2937] pb-3">
                        <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest">Items Sold</label>
                        <button 
                          type="button"
                          onClick={addItem}
                          className="text-[10px] font-bold text-[#8b5cf6] hover:text-[#7c3aed] flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#8b5cf6]/30 hover:bg-[#8b5cf6]/10 transition-all bg-[#020617]"
                        >
                          <Plus className="w-3 h-3" /> Add Item
                        </button>
                      </div>
                      
                      <div className="space-y-4">
                        {transactionData.items.map((item, index) => (
                          <div key={index} className="space-y-4 p-4 rounded-xl bg-[#111827] border border-[#1f2937] group transition-all">
                            {/* Product Name */}
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest block">Product Name</label>
                              <input 
                                required
                                placeholder="Enter product name..."
                                value={item.name}
                                onChange={(e) => updateItem(index, 'name', e.target.value)}
                                className="w-full bg-[#020617] border border-[#1f2937] rounded-xl px-4 py-2.5 text-sm text-[#f9fafb] font-medium focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]"
                              />
                            </div>
                            {/* Qty and Price */}
                            <div className="flex gap-4">
                              <div className="flex-1 space-y-2">
                                <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest block">Qty</label>
                                <input 
                                  required
                                  type="number"
                                  placeholder="0"
                                  value={item.qty}
                                  onChange={(e) => updateItem(index, 'qty', Number(e.target.value))}
                                  className="w-full bg-[#020617] border border-[#1f2937] rounded-xl px-4 py-2.5 text-sm text-[#f9fafb] font-bold focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]"
                                />
                              </div>
                              <div className="flex-1 space-y-2">
                                <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest block">Price (₹)</label>
                                <input 
                                  required
                                  type="number"
                                  placeholder="0"
                                  value={item.price}
                                  onChange={(e) => updateItem(index, 'price', Number(e.target.value))}
                                  className="w-full bg-[#020617] border border-[#1f2937] rounded-xl px-4 py-2.5 text-sm text-[#f9fafb] font-bold focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]"
                                />
                              </div>
                              <div className="flex items-end">
                                <button 
                                  type="button"
                                  onClick={() => removeItem(index)}
                                  disabled={transactionData.items.length === 1}
                                  className="p-2.5 text-[#6b7280] hover:text-[#ef4444] hover:bg-[#ef4444]/10 rounded-xl transition-all disabled:opacity-0"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2 pt-2">
                      <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest block">Transport Cost (Optional)</label>
                      <div className="relative">
                        <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280]" />
                        <input 
                          type="number"
                          placeholder="0"
                          value={transactionData.transportationCost || ""}
                          onChange={(e) => setTransactionData({ ...transactionData, transportationCost: Number(e.target.value) })}
                          className="w-full bg-[#020617] border border-[#1f2937] rounded-xl pl-9 pr-4 py-2.5 text-sm font-bold text-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]"
                        />
                      </div>
                    </div>

                  </div>
                )}
              </form>
            </div>

            <div className="px-6 py-5 bg-[#0b1220] border-t border-[#1f2937] flex items-center justify-between sticky bottom-0">
              <div>
                <p className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest mb-1">Total</p>
                <h4 className="text-2xl font-bold text-[#f9fafb]">
                  ₹{(transactionType === "give" ? totalSaleAmount : transactionData.amount).toLocaleString()}
                </h4>
              </div>
              <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={closeModal}
                  className="px-5 py-2.5 bg-[#111827] hover:bg-[#1f2937] text-[#9ca3af] font-bold rounded-xl border border-[#1f2937] transition-all text-xs"
                >
                  Cancel
                </button>
                <button 
                  form="transaction-form"
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-bold rounded-xl transition-all shadow-md text-xs"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Confirm
                </button>
              </div>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}
