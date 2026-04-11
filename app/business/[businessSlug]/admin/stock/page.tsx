"use client";

import { useEffect, useState } from "react";
import { 
  Package, 
  Plus, 
  Loader2, 
  ChevronRight,
  Edit3,
  AlertCircle,
  CheckCircle2,
  Database,
  Trash2
} from "lucide-react";
import toast from "react-hot-toast";
import clsx from "clsx";

export default function StockPage() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [newStock, setNewStock] = useState({
    name: "",
    currentQuantity: 0,
    unit: "Pcs"
  });

  async function fetchData() {
    try {
      const res = await fetch("/api/business/stock");
      const data = await res.json();
      setStocks(data);
    } catch (err) {
      toast.error("Failed to load inventory");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newStock.name) return toast.error("Please enter a name");

    setIsSaving(true);
    try {
      const res = await fetch("/api/business/stock", {
        method: "POST",
        body: JSON.stringify(newStock),
      });
      if (res.ok) {
        toast.success("Item added to inventory");
        setShowAddModal(false);
        setNewStock({ name: "", currentQuantity: 0, unit: "Pcs" });
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to add item");
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
          <h2 className="text-2xl font-bold text-[#f9fafb] tracking-tight">Inventory Control</h2>
          <p className="text-[#9ca3af] text-sm mt-1 font-medium">Monitor stock levels, units, and supply chain health.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white px-7 py-3.5 rounded-xl font-bold text-base transition-all shadow-md"
        >
          <Plus className="w-5 h-5" />
          Add Material
        </button>
      </div>

      {/* List */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full flex items-center justify-center py-24 bg-[#0b1220] rounded-2xl border border-[#1f2937]">
            <Loader2 className="w-8 h-8 text-[#8b5cf6] animate-spin" />
          </div>
        ) : stocks.length > 0 ? stocks.map((item: any) => (
          <div key={item._id} className="group p-6 rounded-2xl bg-[#0b1220] border border-[#1f2937] hover:border-[#8b5cf6]/30 transition-all duration-300 relative overflow-hidden shadow-sm">
            <div className="flex items-start justify-between mb-5">
              <div className="p-4 rounded-xl bg-[#8b5cf6]/10 text-[#8b5cf6] group-hover:scale-110 group-hover:bg-[#8b5cf6]/20 transition-all">
                <Package className="w-6 h-6" />
              </div>
              <div className="flex items-center gap-3">
                <button className="p-2.5 text-[#9ca3af] hover:text-[#f9fafb] rounded-lg hover:bg-[#111827] transition-all bg-[#020617] border border-[#1f2937]">
                  <Edit3 className="w-5 h-5" />
                </button>
                <button className="p-2.5 text-[#6b7280] hover:text-[#ef4444] rounded-lg hover:bg-[#ef4444]/10 transition-all bg-[#020617] border border-[#1f2937]">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div>
              <h4 className="text-xl font-bold text-[#f9fafb] mb-1 group-hover:text-[#8b5cf6] transition-colors">{item.name}</h4>
              <p className="text-xs font-bold text-[#9ca3af] tracking-widest uppercase">Material Check</p>
            </div>

            <div className="mt-8 flex items-end justify-between">
              <div>
                <p className="text-xs font-bold text-[#9ca3af] uppercase tracking-widest mb-2">On Hand</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-4xl font-black text-[#f9fafb]">{item.currentQuantity}</span>
                  <span className="text-sm font-bold text-[#9ca3af]">{item.unit || "Units"}</span>
                </div>
              </div>
              
              <div className={clsx(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border",
                item.currentQuantity > 10 ? "bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/30" : "bg-[#ef4444]/10 text-[#ef4444] border-[#ef4444]/30"
              )}>
                {item.currentQuantity > 10 ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {item.currentQuantity > 10 ? "Optimal" : "Critically Low"}
              </div>
            </div>

            {/* Background subtle visual */}
            <Database className="absolute -bottom-6 -right-6 w-32 h-32 text-[#f9fafb]/5 group-hover:rotate-12 transition-transform duration-500 pointer-events-none" />
          </div>
        )) : (
          <div className="col-span-full flex flex-col items-center justify-center py-24 text-center bg-[#0b1220] rounded-2xl border border-[#1f2937]">
            <div className="w-16 h-16 bg-[#111827] rounded-2xl flex items-center justify-center mb-6 border border-[#1f2937]">
              <Package className="w-8 h-8 text-[#6b7280]" />
            </div>
            <h4 className="text-[#f9fafb] font-bold text-lg">Inventory is empty</h4>
            <p className="text-[#9ca3af] text-sm mt-2 font-medium">Start adding products or materials to manage your stock.</p>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 duration-300" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-[#0b1220] border border-[#1f2937] w-full max-w-md rounded-2xl shadow-xl overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-[#1f2937] flex items-center justify-between">
              <h3 className="font-bold text-[#f9fafb] tracking-tight">New Stock Definition</h3>
              <button onClick={() => setShowAddModal(false)} className="text-[#9ca3af] hover:text-[#f9fafb] transition-colors p-1 bg-[#111827] rounded-lg border border-[#1f2937]">
                <Plus className="w-4 h-4 rotate-45" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest block">Item Descriptor</label>
                  <input 
                    autoFocus
                    required
                    placeholder="e.g. Industrial Paint G12"
                    value={newStock.name}
                    onChange={(e) => setNewStock({ ...newStock, name: e.target.value })}
                    className="w-full bg-[#020617] border border-[#1f2937] rounded-xl px-4 py-3.5 text-sm text-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all font-medium"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest block">Initial Count</label>
                    <input 
                      required
                      type="number"
                      value={newStock.currentQuantity || ""}
                      onChange={(e) => setNewStock({ ...newStock, currentQuantity: Number(e.target.value) })}
                      className="w-full bg-[#020617] border border-[#1f2937] rounded-xl px-4 py-3.5 text-sm text-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest block">Pricing Unit</label>
                    <select 
                      value={newStock.unit}
                      onChange={(e) => setNewStock({ ...newStock, unit: e.target.value })}
                      className="w-full bg-[#020617] border border-[#1f2937] rounded-xl px-4 py-3.5 text-sm text-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all font-medium appearance-none cursor-pointer"
                    >
                      <option value="Pcs">Pieces (Pcs)</option>
                      <option value="Kg">Kilograms (Kg)</option>
                      <option value="Ltr">Liters (Ltr)</option>
                      <option value="Box">Boxes</option>
                      <option value="Mtr">Meters (Mtr)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex gap-3 flex-col sm:flex-row">
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
                  className="flex-[2] flex items-center justify-center gap-2 bg-[#8b5cf6] hover:bg-[#7c3aed] disabled:opacity-50 text-white px-7 py-3.5 rounded-xl font-bold text-base transition-all shadow-md"
                >
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Package className="w-6 h-6" />}
                  Initialize Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
