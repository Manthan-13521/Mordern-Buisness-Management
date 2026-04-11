"use client";

import { useEffect, useState } from "react";
import { 
  ShoppingBag, 
  Plus, 
  Search, 
  ChevronRight,
  Loader2,
  Calendar,
  Package,
  Trash2,
  Save,
  IndianRupee
} from "lucide-react";
import toast from "react-hot-toast";

export default function SalesPage() {
  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // New Sale State
  const [newSale, setNewSale] = useState({
    customerId: "",
    items: [{ name: "", qty: 1, price: 0 }],
    transportationCost: 0,
    paidAmount: 0,
    date: new Date().toISOString().split('T')[0]
  });

  async function fetchData() {
    try {
      const [salesRes, custRes] = await Promise.all([
        fetch("/api/business/sales"),
        fetch("/api/business/customers")
      ]);
      const salesData = await salesRes.json();
      const custData = await custRes.json();
      setSales(Array.isArray(salesData) ? salesData : salesData.data || []);
      setCustomers(Array.isArray(custData) ? custData : custData.data || custData);
    } catch (err) {
      toast.error("Failed to load records");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newSale.customerId) return toast.error("Please select a customer");
    if (newSale.items.some(it => !it.name || it.price <= 0)) return toast.error("Please fill all item details");

    setIsSaving(true);
    try {
      const res = await fetch("/api/business/sales", {
        method: "POST",
        body: JSON.stringify({ ...newSale, totalAmount, paidAmount: newSale.paidAmount }),
      });
      if (res.ok) {
        toast.success("Sale recorded successfully");
        setShowAddModal(false);
        setNewSale({
          customerId: "",
          items: [{ name: "", qty: 1, price: 0 }],
          transportationCost: 0,
          paidAmount: 0,
          date: new Date().toISOString().split('T')[0]
        });
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to record sale");
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
          <h2 className="text-2xl font-bold text-[#f9fafb] tracking-tight">Sales Ledger</h2>
          <p className="text-[#9ca3af] text-sm mt-1 font-medium">Track all business sales and inventory distribution.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white px-7 py-3.5 rounded-xl font-bold text-base transition-all shadow-md"
        >
          <Plus className="w-5 h-5" />
          New Sale Entry
        </button>
      </div>

      {/* Table */}
      <div className="bg-[#0b1220] border border-[#1f2937] rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 text-[#8b5cf6] animate-spin" />
          </div>
        ) : sales.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-max">
              <thead>
                <tr className="bg-[#0b1220] border-b border-[#1f2937]">
                  <th className="px-6 py-5 text-sm font-semibold text-[#9ca3af] uppercase tracking-wide">Date</th>
                  <th className="px-6 py-5 text-sm font-semibold text-[#9ca3af] uppercase tracking-wide">Customer</th>
                  <th className="px-6 py-5 text-sm font-semibold text-[#9ca3af] uppercase tracking-wide">Items</th>
                  <th className="px-6 py-5 text-sm font-semibold text-[#9ca3af] uppercase tracking-wide text-right">Total Amount</th>
                  <th className="px-6 py-5 text-sm font-semibold text-[#9ca3af] uppercase tracking-wide text-right">Paid Amt</th>
                  <th className="px-6 py-5 text-sm font-semibold text-[#9ca3af] uppercase tracking-wide text-right">Balance</th>
                  <th className="px-6 py-5 text-sm font-semibold text-[#9ca3af] uppercase tracking-wide text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f2937]">
                {sales.map((sale: any) => (
                  <tr key={sale._id} className="hover:bg-[#8b5cf6]/5 transition-colors group border-b border-slate-800 last:border-0">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-[#9ca3af]" />
                        <p className="text-base font-semibold text-white">{new Date(sale.date).toLocaleDateString()}</p>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-base font-semibold text-white group-hover:text-[#8b5cf6] transition-colors">{sale.customerId?.name || "Deleted Customer"}</p>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <Package className="w-5 h-5 text-slate-400" />
                        <p className="text-sm text-slate-400 font-medium">{sale.items?.length || 0} Items</p>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right font-semibold text-lg text-[#ef4444]">
                      ₹{sale.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-5 text-right font-bold text-lg text-[#22c55e]">
                      ₹{(sale.paidAmount || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-5 text-right font-semibold text-lg text-[#f9fafb]">
                      ₹{(sale.amount - (sale.paidAmount || 0)).toLocaleString()}
                    </td>
                    <td className="px-6 py-5 text-right">
                      <button className="p-2.5 inline-flex items-center justify-center bg-[#111827] hover:bg-[#1f2937] text-[#9ca3af] hover:text-white rounded-lg transition-all border border-[#1f2937]">
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center bg-[#0b1220]">
            <div className="w-16 h-16 bg-[#111827] rounded-2xl flex items-center justify-center mb-6 border border-[#1f2937]">
              <ShoppingBag className="w-8 h-8 text-[#6b7280]" />
            </div>
            <h4 className="text-[#f9fafb] font-bold text-lg">No sales records found</h4>
            <p className="text-[#9ca3af] text-sm mt-2 font-medium">Start by recording your first sale.</p>
          </div>
        )}
      </div>

      {/* Add Sale Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 duration-300" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-[#0b1220] border border-[#1f2937] w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 border-b border-[#1f2937] flex items-center justify-between">
              <h3 className="font-bold text-[#f9fafb]">Record New Sale</h3>
              <button onClick={() => setShowAddModal(false)} className="text-[#9ca3af] hover:text-[#f9fafb] transition-colors p-1 bg-[#111827] rounded-lg border border-[#1f2937]">
                <Plus className="w-4 h-4 rotate-45" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-[#0b1220]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest block">Select Customer</label>
                  <select 
                    required
                    value={newSale.customerId}
                    onChange={(e) => setNewSale({ ...newSale, customerId: e.target.value })}
                    className="w-full bg-[#020617] border border-[#1f2937] rounded-xl px-4 py-3.5 text-sm font-medium text-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all appearance-none cursor-pointer"
                  >
                    <option value="">Choose a customer...</option>
                    {customers.map((c: any) => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest block">Sale Date</label>
                  <input 
                    type="date"
                    value={newSale.date}
                    onChange={(e) => setNewSale({ ...newSale, date: e.target.value })}
                    className="w-full bg-[#020617] border border-[#1f2937] rounded-xl px-4 py-3 text-sm font-medium text-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all [color-scheme:dark]"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-[#1f2937] pb-3">
                  <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest">Items Sold</label>
                  <button 
                    type="button"
                    onClick={addItem}
                    className="text-[10px] font-bold text-[#8b5cf6] hover:text-[#7c3aed] uppercase tracking-widest flex items-center gap-1 bg-[#8b5cf6]/5 px-3 py-1.5 rounded-lg border border-[#8b5cf6]/20 transition-all"
                  >
                    <Plus className="w-3 h-3" /> Add Item
                  </button>
                </div>
                
                {newSale.items.map((item, index) => (
                  <div key={index} className="p-5 rounded-xl bg-[#0b1220] border border-[#1f2937] space-y-4 relative group">
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
                        className="w-full bg-[#020617] border border-[#1f2937] rounded-xl px-4 py-3 text-sm text-[#f9fafb] font-medium focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all"
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
                          className="w-full bg-[#020617] border border-[#1f2937] rounded-xl px-4 py-3 text-sm text-[#f9fafb] font-bold focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all"
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
                          className="w-full bg-[#020617] border border-[#1f2937] rounded-xl px-4 py-3 text-sm text-[#f9fafb] font-bold focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all"
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
                      className="w-full bg-[#020617] border border-[#1f2937] rounded-xl pl-9 pr-4 py-3 text-sm font-bold text-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest block">Paid Amount (₹)</label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#22c55e]" />
                    <input 
                      type="number"
                      placeholder="0"
                      value={newSale.paidAmount || ""}
                      onChange={(e) => setNewSale({ ...newSale, paidAmount: Number(e.target.value) })}
                      className="w-full bg-[#020617] border border-[#1f2937] rounded-xl pl-9 pr-4 py-3 text-sm font-bold text-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all"
                    />
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
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2.5 bg-[#111827] hover:bg-[#1f2937] text-[#9ca3af] font-bold rounded-xl border border-[#1f2937] transition-all text-xs"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSubmit}
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
    </div>
  );
}
