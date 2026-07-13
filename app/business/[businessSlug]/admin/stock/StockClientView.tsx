"use client";

import React, { useState, useMemo, memo } from "react";
import {
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  Search,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock
} from "lucide-react";
import { computeStockStatus, StockStatus, StockReason } from "@/lib/stockHelper";
import { stockIn, stockOut, createStockItem } from "./actions";
import toast from "react-hot-toast";

// ── StatusBadge extracted outside component to avoid re-creation on every render ──
const statusStyles: Record<StockStatus, string> = {
  "Healthy": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "Near Minimum": "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  "Low Stock": "bg-orange-500/10 text-orange-400 border-orange-500/20",
  "Out Of Stock": "bg-rose-500/10 text-rose-400 border-rose-500/20",
};
const statusIcons: Record<StockStatus, React.ReactElement> = {
  "Healthy": <CheckCircle2 className="w-3.5 h-3.5" />,
  "Near Minimum": <Clock className="w-3.5 h-3.5" />,
  "Low Stock": <AlertTriangle className="w-3.5 h-3.5" />,
  "Out Of Stock": <XCircle className="w-3.5 h-3.5" />,
};

const StatusBadge = memo(function StatusBadge({ status }: { status: StockStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${statusStyles[status]}`}>
      {statusIcons[status]}
      {status}
    </span>
  );
});

const inputClass = "w-full rounded-xl border border-[#1f2937] bg-[#0b1220] px-3 py-2.5 text-sm text-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]";

interface StockItem {
  _id: string;
  name: string;
  sku: string;
  category: string;
  unit: string;
  currentStock: number;
  minimumStock: number;
  updatedAt: string;
}

interface KPIs {
  totalProducts: number;
  healthy: number;
  nearMinimum: number;
  lowStock: number;
  outOfStock: number;
  todaysConsumption: number;
}

export default function StockClientView({ initialItems, kpis }: { initialItems: StockItem[], kpis: KPIs }) {
  const [items, setItems] = useState<StockItem[]>(initialItems);
  const [search, setSearch] = useState("");

  // Modal state
  const [inModalOpen, setInModalOpen] = useState(false);
  const [outModalOpen, setOutModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);

  // Shared form state
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState<StockReason>(StockReason.SALE);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  // Add product state
  const [newItemData, setNewItemData] = useState({ name: "", sku: "", category: "General", unit: "Pcs", minimumStock: 0 });

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const lower = search.toLowerCase();
    return items.filter(i =>
      i.name.toLowerCase().includes(lower) ||
      i.sku.toLowerCase().includes(lower) ||
      i.category.toLowerCase().includes(lower)
    );
  }, [items, search]);

  const openModal = (item: StockItem, type: "IN" | "OUT") => {
    setSelectedItem(item);
    setQuantity("");
    setReason(type === "IN" ? StockReason.PURCHASE : StockReason.SALE);
    setNotes("");
    if (type === "IN") setInModalOpen(true);
    else setOutModalOpen(true);
  };

  const closeAll = () => {
    setInModalOpen(false);
    setOutModalOpen(false);
    setAddModalOpen(false);
    setSelectedItem(null);
    setQuantity("");
    setNotes("");
  };

  const handleStockIn = async () => {
    const qty = Number(quantity);
    if (!selectedItem || !Number.isFinite(qty) || qty <= 0) return toast.error("Enter a valid quantity.");
    setLoading(true);
    try {
      const res = await stockIn(selectedItem._id, qty, reason, notes);
      if (res?.error) throw new Error(res.error);
      setItems(prev => prev.map(i => i._id === selectedItem._id ? { ...i, currentStock: i.currentStock + qty } : i));
      toast.success(`✅ Added ${qty} ${selectedItem.unit}`);
      setInModalOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStockOut = async () => {
    const qty = Number(quantity);
    if (!selectedItem || !Number.isFinite(qty) || qty <= 0) return toast.error("Enter a valid quantity.");
    if (qty > selectedItem.currentStock) return toast.error(`Insufficient stock. Available: ${selectedItem.currentStock} ${selectedItem.unit}`);
    setLoading(true);
    try {
      const res = await stockOut(selectedItem._id, qty, reason, notes);
      if (res?.error) throw new Error(res.error);
      setItems(prev => prev.map(i => i._id === selectedItem._id ? { ...i, currentStock: i.currentStock - qty } : i));
      toast.success(`✅ Deducted ${qty} ${selectedItem.unit}`);
      setOutModalOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async () => {
    if (!newItemData.name.trim() || !newItemData.sku.trim() || !newItemData.unit.trim()) return toast.error("Name, SKU, and Unit are required.");
    setLoading(true);
    try {
      const res = await createStockItem(newItemData.name, newItemData.sku, newItemData.unit, newItemData.category, newItemData.minimumStock);
      if (res?.error) throw new Error(res.error);
      setItems(prev => [res.item as StockItem, ...prev]);
      toast.success("✅ Product created successfully.");
      setAddModalOpen(false);
      setNewItemData({ name: "", sku: "", category: "General", unit: "Pcs", minimumStock: 0 });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#f9fafb] tracking-tight">Enterprise Inventory</h1>
          <p className="text-[#9ca3af] text-sm mt-1">Real-time stock ledger, auditing, and controls.</p>
        </div>
        <button
          onClick={() => setAddModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md"
        >
          + Add Product
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {[
          { title: "Total Products", val: kpis.totalProducts, icon: <Package className="w-5 h-5 text-indigo-400" />, bg: "bg-indigo-500/10" },
          { title: "Healthy", val: kpis.healthy, icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />, bg: "bg-emerald-500/10" },
          { title: "Low Stock", val: kpis.lowStock, icon: <AlertTriangle className="w-5 h-5 text-orange-400" />, bg: "bg-orange-500/10" },
          { title: "Out Of Stock", val: kpis.outOfStock, icon: <XCircle className="w-5 h-5 text-rose-400" />, bg: "bg-rose-500/10" },
          { title: "Today's Used", val: kpis.todaysConsumption, icon: <ArrowUpFromLine className="w-5 h-5 text-purple-400" />, bg: "bg-purple-500/10" },
        ].map((card, idx) => (
          <div key={idx} className="bg-[#0b1220] p-5 rounded-2xl border border-[#1f2937] flex flex-col justify-between shadow-sm hover:border-[#374151] transition-colors">
            <div className="flex justify-between items-start mb-4">
              <span className="text-[#9ca3af] font-semibold text-xs tracking-wide uppercase">{card.title}</span>
              <div className={`p-2 rounded-lg ${card.bg}`}>{card.icon}</div>
            </div>
            <div className="text-2xl font-extrabold text-[#f9fafb]">{card.val}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-[#0b1220] border border-[#1f2937] rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#1f2937]">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by Name, SKU, or Category..."
              className="w-full bg-[#020617] border border-[#1f2937] rounded-xl pl-9 pr-4 py-2 text-sm text-[#f9fafb] placeholder:text-[#6b7280] focus:ring-2 focus:ring-[#8b5cf6] focus:border-transparent outline-none"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#020617] text-[#9ca3af]">
              <tr>
                <th className="px-5 py-4 font-semibold text-xs uppercase tracking-wider">Product</th>
                <th className="px-5 py-4 font-semibold text-xs uppercase tracking-wider">Category</th>
                <th className="px-5 py-4 font-semibold text-xs uppercase tracking-wider">Stock</th>
                <th className="px-5 py-4 font-semibold text-xs uppercase tracking-wider">Status</th>
                <th className="px-5 py-4 font-semibold text-xs uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f2937]">
              {filteredItems.map(item => (
                <tr key={item._id} className="hover:bg-[#1f2937]/30 transition-colors">
                  <td className="px-5 py-4">
                    <div className="font-bold text-[#f9fafb]">{item.name}</div>
                    <div className="text-xs text-[#6b7280] font-mono mt-0.5">SKU: {item.sku}</div>
                  </td>
                  <td className="px-5 py-4 text-[#9ca3af]">{item.category}</td>
                  <td className="px-5 py-4">
                    <div className="font-extrabold text-[#f9fafb] text-base">{item.currentStock}<span className="text-xs font-semibold text-[#6b7280] ml-1">{item.unit}</span></div>
                    <div className="text-[10px] text-[#6b7280] uppercase tracking-wider mt-1">Min: {item.minimumStock}</div>
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={computeStockStatus(item.currentStock, item.minimumStock)} />
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openModal(item, "IN")}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors font-medium text-xs border border-emerald-500/20"
                      >
                        <ArrowDownToLine className="w-3.5 h-3.5" /> IN
                      </button>
                      <button
                        onClick={() => openModal(item, "OUT")}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors font-medium text-xs border border-rose-500/20"
                      >
                        <ArrowUpFromLine className="w-3.5 h-3.5" /> OUT
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-16 text-[#6b7280]">
                    {search ? "No products match your search." : "No products yet. Click \"+ Add Product\" to get started."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODALS ── */}

      {/* Add Product Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={closeAll}>
          <div className="bg-[#0b1220] border border-[#1f2937] rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-[#f9fafb] mb-1">Create New Product</h2>
            <p className="text-sm text-[#9ca3af] mb-6">Add a new item to your inventory catalog.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#9ca3af] mb-1.5">Product Name</label>
                <input type="text" value={newItemData.name} onChange={e => setNewItemData(p => ({ ...p, name: e.target.value }))} className={inputClass} placeholder="e.g. Printer Paper A4" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#9ca3af] mb-1.5">SKU</label>
                  <input type="text" value={newItemData.sku} onChange={e => setNewItemData(p => ({ ...p, sku: e.target.value }))} className={inputClass} placeholder="PPR-A4-01" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#9ca3af] mb-1.5">Category</label>
                  <input type="text" value={newItemData.category} onChange={e => setNewItemData(p => ({ ...p, category: e.target.value }))} className={inputClass} placeholder="General" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#9ca3af] mb-1.5">Unit</label>
                  <input type="text" value={newItemData.unit} onChange={e => setNewItemData(p => ({ ...p, unit: e.target.value }))} className={inputClass} placeholder="Box, Kg, Pcs..." />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#9ca3af] mb-1.5">Min Stock Alert</label>
                  <input type="number" min="0" value={newItemData.minimumStock} onChange={e => setNewItemData(p => ({ ...p, minimumStock: Number(e.target.value) }))} className={inputClass} placeholder="0" />
                </div>
              </div>
            </div>
            <div className="mt-8 flex justify-end gap-3">
              <button disabled={loading} onClick={closeAll} className="px-5 py-2.5 rounded-xl font-semibold text-sm text-[#9ca3af] hover:bg-[#1f2937] transition">Cancel</button>
              <button disabled={loading} onClick={handleAddProduct} className="px-5 py-2.5 rounded-xl font-bold text-sm bg-[#8b5cf6] hover:bg-[#7c3aed] text-white transition shadow-md disabled:opacity-50">
                {loading ? "Creating..." : "Create Product"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock IN Modal */}
      {inModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={closeAll}>
          <div className="bg-[#0b1220] border border-[#1f2937] rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-[#f9fafb] mb-1">Stock Came</h2>
            <p className="text-sm text-[#9ca3af] mb-6">Receive stock for <strong className="text-emerald-400">{selectedItem.name}</strong></p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#9ca3af] mb-1.5">Quantity Received</label>
                <div className="relative">
                  <input type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} className={inputClass} placeholder="0" autoFocus />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6b7280] text-xs font-semibold">{selectedItem.unit}</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#9ca3af] mb-1.5">Reason</label>
                <select value={reason} onChange={e => setReason(e.target.value as StockReason)} className={inputClass}>
                  <option value={StockReason.PURCHASE}>Purchase</option>
                  <option value={StockReason.RETURN}>Return</option>
                  <option value={StockReason.ADJUSTMENT}>Adjustment</option>
                  <option value={StockReason.OPENING_STOCK}>Opening Stock</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#9ca3af] mb-1.5">Notes (Optional)</label>
                <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className={inputClass} placeholder="Invoice #, Supplier info..." />
              </div>
            </div>
            <div className="mt-8 flex justify-end gap-3">
              <button disabled={loading} onClick={closeAll} className="px-5 py-2.5 rounded-xl font-semibold text-sm text-[#9ca3af] hover:bg-[#1f2937] transition">Cancel</button>
              <button disabled={loading} onClick={handleStockIn} className="px-5 py-2.5 rounded-xl font-bold text-sm bg-emerald-500 hover:bg-emerald-400 text-black transition disabled:opacity-50">
                {loading ? "Saving..." : "Confirm Receipt"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock OUT Modal */}
      {outModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={closeAll}>
          <div className="bg-[#0b1220] border border-[#1f2937] rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-[#f9fafb] mb-1">Stock Used Today</h2>
            <p className="text-sm text-[#9ca3af] mb-6">Deduct stock for <strong className="text-rose-400">{selectedItem.name}</strong></p>
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 mb-5 flex justify-between items-center">
              <span className="text-xs font-semibold text-rose-400/80">Available</span>
              <span className="font-extrabold text-rose-400">{selectedItem.currentStock} {selectedItem.unit}</span>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#9ca3af] mb-1.5">Quantity Used</label>
                <div className="relative">
                  <input type="number" min="1" max={selectedItem.currentStock} value={quantity} onChange={e => setQuantity(e.target.value)} className={inputClass} placeholder="0" autoFocus />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6b7280] text-xs font-semibold">{selectedItem.unit}</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#9ca3af] mb-1.5">Reason</label>
                <select value={reason} onChange={e => setReason(e.target.value as StockReason)} className={inputClass}>
                  <option value={StockReason.SALE}>Sale</option>
                  <option value={StockReason.CONSUMPTION}>Consumption</option>
                  <option value={StockReason.WASTAGE}>Wastage</option>
                  <option value={StockReason.DAMAGE}>Damage</option>
                  <option value={StockReason.ADJUSTMENT}>Adjustment</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#9ca3af] mb-1.5">Notes (Optional)</label>
                <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className={inputClass} placeholder="Why was this used?" />
              </div>
            </div>
            <div className="mt-8 flex justify-end gap-3">
              <button disabled={loading} onClick={closeAll} className="px-5 py-2.5 rounded-xl font-semibold text-sm text-[#9ca3af] hover:bg-[#1f2937] transition">Cancel</button>
              <button disabled={loading} onClick={handleStockOut} className="px-5 py-2.5 rounded-xl font-bold text-sm bg-rose-500 hover:bg-rose-400 text-white transition disabled:opacity-50">
                {loading ? "Saving..." : "Confirm Deduction"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
