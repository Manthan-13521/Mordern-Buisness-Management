"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { Search, ChevronDown, Users, X } from "lucide-react";

/* ═══════════════════════════════════════════════════ */
/*  NUMBER TO WORDS (Indian system)                   */
/* ═══════════════════════════════════════════════════ */
function numberToWords(n: number): string {
  if (n === 0) return "ZERO RUPEES ONLY";
  const ones = ["","ONE","TWO","THREE","FOUR","FIVE","SIX","SEVEN","EIGHT","NINE",
    "TEN","ELEVEN","TWELVE","THIRTEEN","FOURTEEN","FIFTEEN","SIXTEEN","SEVENTEEN","EIGHTEEN","NINETEEN"];
  const tens = ["","","TWENTY","THIRTY","FORTY","FIFTY","SIXTY","SEVENTY","EIGHTY","NINETY"];

  function convert(num: number): string {
    if (num < 20) return ones[num];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? " " + ones[num % 10] : "");
    if (num < 1000) return ones[Math.floor(num / 100)] + " HUNDRED" + (num % 100 ? " AND " + convert(num % 100) : "");
    if (num < 100000) return convert(Math.floor(num / 1000)) + " THOUSAND" + (num % 1000 ? " " + convert(num % 1000) : "");
    if (num < 10000000) return convert(Math.floor(num / 100000)) + " LAKH" + (num % 100000 ? " " + convert(num % 100000) : "");
    return convert(Math.floor(num / 10000000)) + " CRORE" + (num % 10000000 ? " " + convert(num % 10000000) : "");
  }

  const rupees = Math.floor(n);
  const paise = Math.round((n - rupees) * 100);
  let result = convert(rupees) + " RUPEES";
  if (paise > 0) result += " AND " + convert(paise) + " PAISE";
  return result + " ONLY";
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return dd + "/" + mm + "/" + yy;
}

/* ═══════════════════════════════════════════════════ */
/*  TYPES                                             */
/* ═══════════════════════════════════════════════════ */
interface ProductRow {
  id: number;
  desc: string;
  hsn: string;
  qty: number;
  rate: number;
}

export default function InvoicePage() {
  const { data: session } = useSession();
  // businessId used as a per-business key in localStorage
  const bizKey = (session?.user as any)?.businessId || "default";

  /* ── Form State ── */
  const [bname, setBname] = useState("");
  const [bdesc, setBdesc] = useState("");
  const [bgst, setBgst] = useState("");
  const [baddr, setBaddr] = useState("");

  const [cname, setCname] = useState("");
  const [cbizname, setCbizname] = useState("");
  const [caddr1, setCaddr1] = useState("");
  const [caddr2, setCaddr2] = useState("");
  const [cgst, setCgst] = useState("");

  const [inv, setInv] = useState("");
  const [invdate, setInvdate] = useState("");
  const [dcno, setDcno] = useState("");
  const [orderno, setOrderno] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [waybill, setWaybill] = useState("");

  const [products, setProducts] = useState<ProductRow[]>([{ id: 1, desc: "", hsn: "", qty: 0, rate: 0 }]);
  let nextId = useRef(2);

  const [cgstRate, setCgstRate] = useState(0);
  const [sgstRate, setSgstRate] = useState(0);
  const [igstRate, setIgstRate] = useState(0);

  const [bank, setBank] = useState("");
  const [branch, setBranch] = useState("");
  const [acc, setAcc] = useState("");
  const [ifsc, setIfsc] = useState("");

  const [showInvoice, setShowInvoice] = useState(false);

  /* ── Customer dropdown state ── */
  const [allCustomers, setAllCustomers] = useState<any[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return allCustomers;
    const q = customerSearch.toLowerCase();
    return allCustomers.filter((c: any) =>
      c.name?.toLowerCase().includes(q) ||
      c.businessName?.toLowerCase().includes(q) ||
      c.phone?.includes(q)
    );
  }, [allCustomers, customerSearch]);

  // 0. Init: today's date + fetch customers for dropdown
  useEffect(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    setInvdate(`${yyyy}-${mm}-${dd}`);

    fetch("/api/business/customers", { cache: "no-store" })
      .then(res => res.ok ? res.json() : [])
      .then(data => setAllCustomers(Array.isArray(data) ? data : []))
      .catch(() => setAllCustomers([]));
  }, []);

  // 1. Fetch real business details from DB on login
  useEffect(() => {
    fetch("/api/business/info", { cache: "no-store" })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        // Name and address always come from DB — user may override below
        setBname(prev => prev || data.name || "");
        setBaddr(prev => prev || data.address || "");
      })
      .catch(() => {});
  }, []);

  // 2. Load per-business persisted invoice settings from localStorage
  useEffect(() => {
    if (!bizKey) return;
    const k = bizKey;

    const savedBname = localStorage.getItem(`inv_${k}_bname`);
    if (savedBname !== null) setBname(savedBname);

    const savedBdesc = localStorage.getItem(`inv_${k}_bdesc`);
    if (savedBdesc !== null) setBdesc(savedBdesc);

    const savedBgst = localStorage.getItem(`inv_${k}_bgst`);
    if (savedBgst !== null) setBgst(savedBgst);

    const savedBaddr = localStorage.getItem(`inv_${k}_baddr`);
    if (savedBaddr !== null) setBaddr(savedBaddr);

    const savedCgst = localStorage.getItem(`inv_${k}_cgstRate`);
    if (savedCgst) setCgstRate(Number(savedCgst));

    const savedSgst = localStorage.getItem(`inv_${k}_sgstRate`);
    if (savedSgst) setSgstRate(Number(savedSgst));

    const savedIgst = localStorage.getItem(`inv_${k}_igstRate`);
    if (savedIgst) setIgstRate(Number(savedIgst));

    // Bank details — empty until user fills them for this business
    const savedBank = localStorage.getItem(`inv_${k}_bank`);
    if (savedBank !== null) setBank(savedBank);

    const savedBranch = localStorage.getItem(`inv_${k}_branch`);
    if (savedBranch !== null) setBranch(savedBranch);

    const savedAcc = localStorage.getItem(`inv_${k}_acc`);
    if (savedAcc !== null) setAcc(savedAcc);

    const savedIfsc = localStorage.getItem(`inv_${k}_ifsc`);
    if (savedIfsc !== null) setIfsc(savedIfsc);
  }, [bizKey]);

  // 3. Save to per-business localStorage on every change
  useEffect(() => {
    if (!bizKey) return;
    const k = bizKey;
    localStorage.setItem(`inv_${k}_bname`, bname);
    localStorage.setItem(`inv_${k}_bdesc`, bdesc);
    localStorage.setItem(`inv_${k}_bgst`, bgst);
    localStorage.setItem(`inv_${k}_baddr`, baddr);
    localStorage.setItem(`inv_${k}_cgstRate`, cgstRate.toString());
    localStorage.setItem(`inv_${k}_sgstRate`, sgstRate.toString());
    localStorage.setItem(`inv_${k}_igstRate`, igstRate.toString());
    localStorage.setItem(`inv_${k}_bank`, bank);
    localStorage.setItem(`inv_${k}_branch`, branch);
    localStorage.setItem(`inv_${k}_acc`, acc);
    localStorage.setItem(`inv_${k}_ifsc`, ifsc);
  }, [bizKey, bname, bdesc, bgst, baddr, cgstRate, sgstRate, igstRate, bank, branch, acc, ifsc]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowCustomerDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* ── Select customer and auto-fill ── */
  function selectCustomer(customer: any) {
    setSelectedCustomerId(customer._id);
    setCname(customer.name || "");
    setCbizname(customer.businessName || "");
    setCgst(customer.gstNumber || "");
    // Split address into two lines if possible
    const addr = customer.address || "";
    const commaIdx = addr.indexOf(",", Math.floor(addr.length / 2));
    if (commaIdx > 0) {
      setCaddr1(addr.substring(0, commaIdx + 1).trim());
      setCaddr2(addr.substring(commaIdx + 1).trim());
    } else {
      setCaddr1(addr);
      setCaddr2("");
    }
    setCustomerSearch("");
    setShowCustomerDropdown(false);
  }

  function clearSelectedCustomer() {
    setSelectedCustomerId(null);
    setCname("");
    setCbizname("");
    setCgst("");
    setCaddr1("");
    setCaddr2("");
  }

  /* ── Product helpers ── */
  const addProduct = () => {
    setProducts([...products, { id: nextId.current++, desc: "", hsn: "", qty: 0, rate: 0 }]);
  };

  const removeProduct = (id: number) => {
    if (products.length <= 1) return;
    setProducts(products.filter((p) => p.id !== id));
  };

  const updateProduct = (id: number, field: keyof ProductRow, value: any) => {
    setProducts(products.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  /* ── Calculations ── */
  const subtotal = products.reduce((s, p) => s + p.qty * p.rate, 0);
  const cgstAmt = subtotal * cgstRate / 100;
  const sgstAmt = subtotal * sgstRate / 100;
  const igstAmt = subtotal * igstRate / 100;
  const grandTotal = subtotal + cgstAmt + sgstAmt + igstAmt;

  const MIN_ROWS = 15;

  /* ═══════════════════════════════════════════════════ */
  /*  PRINT HANDLER                                     */
  /* ═══════════════════════════════════════════════════ */
  const handlePrint = () => {
    const printContents = document.getElementById("a4-invoice")?.innerHTML;
    if (!printContents) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html><head><title>Tax Invoice</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Times New Roman', Times, serif; font-size: 11.5px; color: #000; }
        @page { size: A4; margin: 0; }
        .a4-page { width: 210mm; height: 297mm; padding: 5mm 8mm; }
        table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        td, th { border: 1px solid #000; padding: 3px 5px; font-size: 11.5px; vertical-align: top; word-wrap: break-word; }
        th { background: #f5f5f5; font-weight: bold; text-align: center; }
        .center { text-align: center; }
        .right { text-align: right; }
        .bold { font-weight: bold; }
        .product-row td { height: 22px; }
      </style>
      </head><body>
      <div class="a4-page">${printContents}</div>
      </body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 300);
  };

  /* ═══════════════════════════════════════════════════ */
  /*  RENDER                                            */
  /* ═══════════════════════════════════════════════════ */
  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-7xl mx-auto">

      {/* ── FORM VIEW ── */}
      {!showInvoice && (
        <>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0b1220] p-6 rounded-2xl border border-[#1f2937] shadow-sm">
            <div>
              <h2 className="text-2xl font-bold text-[#f9fafb] tracking-tight">Tax Invoice Generator</h2>
              <p className="text-[#9ca3af] text-sm mt-1 font-medium">Create and print GST compliant A4 invoices.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* BUSINESS DETAILS */}
            <div className="bg-[#0b1220] border border-[#1f2937] rounded-2xl p-6 space-y-4">
              <h3 className="text-[10px] font-bold text-[#ffd200] uppercase tracking-widest flex items-center gap-2">
                <span className="text-base">🏢</span> Business Details
              </h3>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest">Business Name</label>
                  <input value={bname} onChange={(e) => setBname(e.target.value)}
                    className="w-full bg-[#020617] border border-[#1f2937] rounded-xl px-4 py-3 text-sm font-medium text-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest">Description</label>
                  <input value={bdesc} onChange={(e) => setBdesc(e.target.value)}
                    className="w-full bg-[#020617] border border-[#1f2937] rounded-xl px-4 py-3 text-sm font-medium text-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest">GST Number</label>
                  <input value={bgst} onChange={(e) => setBgst(e.target.value)}
                    className="w-full bg-[#020617] border border-[#1f2937] rounded-xl px-4 py-3 text-sm font-medium text-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest">Address</label>
                  <input value={baddr} onChange={(e) => setBaddr(e.target.value)}
                    className="w-full bg-[#020617] border border-[#1f2937] rounded-xl px-4 py-3 text-sm font-medium text-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all" />
                </div>
              </div>
            </div>

            {/* CUSTOMER DETAILS */}
            <div className="bg-[#0b1220] border border-[#1f2937] rounded-2xl p-6 space-y-4">
              <h3 className="text-[10px] font-bold text-[#ffd200] uppercase tracking-widest flex items-center gap-2">
                <span className="text-base">👤</span> Customer Details
              </h3>
              <div className="space-y-3">
                {/* Searchable Customer Dropdown */}
                <div className="space-y-1" ref={dropdownRef}>
                  <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest flex items-center gap-2">
                    Select Customer
                    {selectedCustomerId && (
                      <button
                        type="button"
                        onClick={clearSelectedCustomer}
                        className="inline-flex items-center gap-1 text-[#ef4444] hover:text-[#f87171] transition-colors"
                      >
                        <X className="w-3 h-3" /> Clear
                      </button>
                    )}
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280] pointer-events-none z-10" />
                    <input
                      value={showCustomerDropdown ? customerSearch : (selectedCustomerId ? cname : customerSearch)}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value);
                        setShowCustomerDropdown(true);
                        if (selectedCustomerId) {
                          setSelectedCustomerId(null);
                        }
                      }}
                      onFocus={() => setShowCustomerDropdown(true)}
                      placeholder="Search by name, business or phone..."
                      className="w-full bg-[#020617] border border-[#1f2937] rounded-xl pl-10 pr-10 py-3 text-sm font-medium text-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all placeholder:text-[#374151]"
                    />
                    <ChevronDown className={`absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280] pointer-events-none transition-transform ${showCustomerDropdown ? 'rotate-180' : ''}`} />

                    {/* Dropdown List */}
                    {showCustomerDropdown && (
                      <div className="absolute z-50 w-full mt-1 bg-[#0b1220] border border-[#1f2937] rounded-xl shadow-2xl max-h-56 overflow-y-auto custom-scrollbar">
                        {filteredCustomers.length > 0 ? filteredCustomers.map((c: any) => (
                          <button
                            key={c._id}
                            type="button"
                            onClick={() => selectCustomer(c)}
                            className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-[#8b5cf6]/10 transition-colors border-b border-[#1f2937]/50 last:border-0 ${
                              selectedCustomerId === c._id ? 'bg-[#8b5cf6]/15' : ''
                            }`}
                          >
                            <div className="w-8 h-8 rounded-full bg-[#111827] border border-[#1f2937] flex items-center justify-center text-xs font-bold text-[#8b5cf6] flex-shrink-0">
                              {c.name?.[0]?.toUpperCase() || '?'}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-[#f9fafb] truncate">{c.name}</p>
                              <p className="text-[10px] text-[#6b7280] truncate">
                                {c.businessName ? c.businessName : ''}
                                {c.businessName && c.phone ? ' • ' : ''}
                                {c.phone || ''}
                              </p>
                            </div>
                            {c.gstNumber && (
                              <span className="text-[9px] font-bold text-[#22c55e] bg-[#22c55e]/10 px-2 py-0.5 rounded-md border border-[#22c55e]/20 flex-shrink-0">GST</span>
                            )}
                          </button>
                        )) : (
                          <div className="px-4 py-6 text-center">
                            <Users className="w-5 h-5 text-[#374151] mx-auto mb-2" />
                            <p className="text-xs text-[#6b7280] font-medium">No customers found</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest">Customer Name</label>
                  <input value={cname} onChange={(e) => setCname(e.target.value)} placeholder="Customer / Contact Name"
                    className="w-full bg-[#020617] border border-[#1f2937] rounded-xl px-4 py-3 text-sm font-medium text-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all placeholder:text-[#374151]" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest">Business Name</label>
                  <input value={cbizname} onChange={(e) => setCbizname(e.target.value)} placeholder="Business / Company Name"
                    className="w-full bg-[#020617] border border-[#1f2937] rounded-xl px-4 py-3 text-sm font-medium text-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all placeholder:text-[#374151]" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest">Address Line 1</label>
                  <input value={caddr1} onChange={(e) => setCaddr1(e.target.value)} placeholder="Address line 1"
                    className="w-full bg-[#020617] border border-[#1f2937] rounded-xl px-4 py-3 text-sm font-medium text-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all placeholder:text-[#374151]" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest">Address Line 2 / City</label>
                  <input value={caddr2} onChange={(e) => setCaddr2(e.target.value)} placeholder="City / State"
                    className="w-full bg-[#020617] border border-[#1f2937] rounded-xl px-4 py-3 text-sm font-medium text-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all placeholder:text-[#374151]" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest">GST Number</label>
                  <input value={cgst} onChange={(e) => setCgst(e.target.value)} placeholder="Customer GST"
                    className="w-full bg-[#020617] border border-[#1f2937] rounded-xl px-4 py-3 text-sm font-medium text-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all placeholder:text-[#374151]" />
                </div>
              </div>
            </div>

            {/* INVOICE DETAILS */}
            <div className="bg-[#0b1220] border border-[#1f2937] rounded-2xl p-6 space-y-4 lg:col-span-2">
              <h3 className="text-[10px] font-bold text-[#ffd200] uppercase tracking-widest flex items-center gap-2">
                <span className="text-base">📄</span> Invoice Details
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest">Invoice Number</label>
                  <input value={inv} onChange={(e) => setInv(e.target.value)} placeholder="e.g. 54"
                    className="w-full bg-[#020617] border border-[#1f2937] rounded-xl px-4 py-3 text-sm font-medium text-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all placeholder:text-[#374151]" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest">Date</label>
                  <input type="date" value={invdate} onChange={(e) => setInvdate(e.target.value)}
                    className="w-full bg-[#020617] border border-[#1f2937] rounded-xl px-4 py-3 text-sm font-medium text-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all [color-scheme:dark]" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest">DC Number</label>
                  <input value={dcno} onChange={(e) => setDcno(e.target.value)} placeholder="DC No."
                    className="w-full bg-[#020617] border border-[#1f2937] rounded-xl px-4 py-3 text-sm font-medium text-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all placeholder:text-[#374151]" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest">Order Number</label>
                  <input value={orderno} onChange={(e) => setOrderno(e.target.value)} placeholder="e.g. Verbal"
                    className="w-full bg-[#020617] border border-[#1f2937] rounded-xl px-4 py-3 text-sm font-medium text-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all placeholder:text-[#374151]" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest">Vehicle Number</label>
                  <input value={vehicle} onChange={(e) => setVehicle(e.target.value)} placeholder="e.g. TG08V4944"
                    className="w-full bg-[#020617] border border-[#1f2937] rounded-xl px-4 py-3 text-sm font-medium text-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all placeholder:text-[#374151]" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest">Way Bill Number</label>
                  <input value={waybill} onChange={(e) => setWaybill(e.target.value)} placeholder="Way Bill No."
                    className="w-full bg-[#020617] border border-[#1f2937] rounded-xl px-4 py-3 text-sm font-medium text-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all placeholder:text-[#374151]" />
                </div>
              </div>
            </div>

            {/* PRODUCT TABLE */}
            <div className="bg-[#0b1220] border border-[#1f2937] rounded-2xl p-6 space-y-4 lg:col-span-2">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-bold text-[#ffd200] uppercase tracking-widest flex items-center gap-2">
                  <span className="text-base">📦</span> Products / Items
                </h3>
                <button onClick={addProduct}
                  className="text-[10px] font-bold text-[#ffd200] hover:text-white uppercase tracking-widest flex items-center gap-1 bg-[#ffd200]/5 px-3 py-1.5 rounded-lg border border-[#ffd200]/20 transition-all">
                  ＋ Add Item
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#1f2937]">
                      <th className="px-3 py-3 text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest w-[35px]">#</th>
                      <th className="px-3 py-3 text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest">Description</th>
                      <th className="px-3 py-3 text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest w-[90px]">HSN</th>
                      <th className="px-3 py-3 text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest w-[60px]">Qty</th>
                      <th className="px-3 py-3 text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest w-[80px]">Rate</th>
                      <th className="px-3 py-3 text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest w-[80px] text-right">Amount</th>
                      <th className="w-[40px]"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p, idx) => (
                      <tr key={p.id} className="border-b border-[#1f2937]/50">
                        <td className="px-3 py-2 text-sm text-[#6b7280]">{idx + 1}</td>
                        <td className="px-1 py-2">
                          <input value={p.desc} onChange={(e) => updateProduct(p.id, "desc", e.target.value)} placeholder="Item description"
                            className="w-full bg-[#020617] border border-[#1f2937] rounded-lg px-3 py-2 text-sm text-[#f9fafb] focus:outline-none focus:ring-1 focus:ring-[#8b5cf6] placeholder:text-[#374151]" />
                        </td>
                        <td className="px-1 py-2">
                          <input value={p.hsn} onChange={(e) => updateProduct(p.id, "hsn", e.target.value)} placeholder="HSN"
                            className="w-full bg-[#020617] border border-[#1f2937] rounded-lg px-3 py-2 text-sm text-[#f9fafb] focus:outline-none focus:ring-1 focus:ring-[#8b5cf6] placeholder:text-[#374151]" />
                        </td>
                        <td className="px-1 py-2">
                          <input type="number" step="0.01" value={p.qty || ""} onChange={(e) => updateProduct(p.id, "qty", Number(e.target.value))} placeholder="0"
                            className="w-full bg-[#020617] border border-[#1f2937] rounded-lg px-3 py-2 text-sm text-[#f9fafb] focus:outline-none focus:ring-1 focus:ring-[#8b5cf6] placeholder:text-[#374151]" />
                        </td>
                        <td className="px-1 py-2">
                          <input type="number" step="0.01" value={p.rate || ""} onChange={(e) => updateProduct(p.id, "rate", Number(e.target.value))} placeholder="0.00"
                            className="w-full bg-[#020617] border border-[#1f2937] rounded-lg px-3 py-2 text-sm text-[#f9fafb] focus:outline-none focus:ring-1 focus:ring-[#8b5cf6] placeholder:text-[#374151]" />
                        </td>
                        <td className="px-3 py-2 text-right text-sm font-semibold text-[#4ade80]">
                          ₹{(p.qty * p.rate).toFixed(2)}
                        </td>
                        <td className="px-1 py-2">
                          <button onClick={() => removeProduct(p.id)} disabled={products.length <= 1}
                            className="p-1.5 text-[#6b7280] hover:text-[#ef4444] hover:bg-[#ef4444]/10 rounded-lg transition-all disabled:opacity-20">
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* TAX */}
            <div className="bg-[#0b1220] border border-[#1f2937] rounded-2xl p-6 space-y-4">
              <h3 className="text-[10px] font-bold text-[#ffd200] uppercase tracking-widest flex items-center gap-2">
                <span className="text-base">💰</span> Tax Rates
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest">CGST %</label>
                  <input type="number" step="0.01" value={cgstRate || ""} onChange={(e) => setCgstRate(Number(e.target.value))}
                    className="w-full bg-[#020617] border border-[#1f2937] rounded-xl px-4 py-3 text-sm font-bold text-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest">SGST %</label>
                  <input type="number" step="0.01" value={sgstRate || ""} onChange={(e) => setSgstRate(Number(e.target.value))}
                    className="w-full bg-[#020617] border border-[#1f2937] rounded-xl px-4 py-3 text-sm font-bold text-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest">IGST %</label>
                  <input type="number" step="0.01" value={igstRate || ""} onChange={(e) => setIgstRate(Number(e.target.value))}
                    className="w-full bg-[#020617] border border-[#1f2937] rounded-xl px-4 py-3 text-sm font-bold text-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all" />
                </div>
              </div>
              {/* Live preview */}
              <div className="border-t border-[#1f2937] pt-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-[#9ca3af]">Subtotal</span><span className="text-white font-medium">₹{subtotal.toFixed(2)}</span></div>
                {cgstRate > 0 && <div className="flex justify-between"><span className="text-[#9ca3af]">CGST @{cgstRate}%</span><span className="text-white font-medium">₹{cgstAmt.toFixed(2)}</span></div>}
                {sgstRate > 0 && <div className="flex justify-between"><span className="text-[#9ca3af]">SGST @{sgstRate}%</span><span className="text-white font-medium">₹{sgstAmt.toFixed(2)}</span></div>}
                {igstRate > 0 && <div className="flex justify-between"><span className="text-[#9ca3af]">IGST @{igstRate}%</span><span className="text-white font-medium">₹{igstAmt.toFixed(2)}</span></div>}
                <div className="flex justify-between border-t border-[#1f2937] pt-2">
                  <span className="text-[#ffd200] font-bold text-base">Grand Total</span>
                  <span className="text-[#4ade80] font-bold text-base">₹{grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* BANK */}
            <div className="bg-[#0b1220] border border-[#1f2937] rounded-2xl p-6 space-y-4">
              <h3 className="text-[10px] font-bold text-[#ffd200] uppercase tracking-widest flex items-center gap-2">
                <span className="text-base">🏦</span> Bank Details
              </h3>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest">Bank Name</label>
                  <input value={bank} onChange={(e) => setBank(e.target.value)} placeholder="e.g. ICICI Bank"
                    className="w-full bg-[#020617] border border-[#1f2937] rounded-xl px-4 py-3 text-sm font-medium text-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all placeholder:text-[#374151]" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest">Branch</label>
                  <input value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="Branch Name"
                    className="w-full bg-[#020617] border border-[#1f2937] rounded-xl px-4 py-3 text-sm font-medium text-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all placeholder:text-[#374151]" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest">Account Number</label>
                  <input value={acc} onChange={(e) => setAcc(e.target.value)} placeholder="Account No."
                    className="w-full bg-[#020617] border border-[#1f2937] rounded-xl px-4 py-3 text-sm font-medium text-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all placeholder:text-[#374151]" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest">IFSC Code</label>
                  <input value={ifsc} onChange={(e) => setIfsc(e.target.value)} placeholder="IFSC Code"
                    className="w-full bg-[#020617] border border-[#1f2937] rounded-xl px-4 py-3 text-sm font-medium text-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all placeholder:text-[#374151]" />
                </div>
              </div>
            </div>
          </div>

          {/* Preview Button */}
          <div className="flex justify-center pt-2 pb-8">
            <button onClick={() => setShowInvoice(true)}
              className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#f7971e] to-[#ffd200] text-[#1a1a2e] font-bold rounded-xl text-base shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all">
              ⚡ Preview Invoice
            </button>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════ */}
      {/*  A4 INVOICE OUTPUT                                */}
      {/* ══════════════════════════════════════════════════ */}
      {showInvoice && (
        <>
          {/* Action Buttons */}
          <div className="flex justify-center gap-4 mb-4">
            <button onClick={() => setShowInvoice(false)}
              className="px-6 py-3 bg-[#111827] hover:bg-[#1f2937] text-white font-bold rounded-xl border border-[#1f2937] transition-all text-sm">
              ✏️ Edit
            </button>
            <button onClick={handlePrint}
              className="px-6 py-3 bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all text-sm">
              🖨️ Print
            </button>
          </div>

          {/* A4 Invoice */}
          <div className="mx-auto" style={{ width: "210mm", minHeight: "297mm", padding: "10mm", background: "#fff", color: "#000", boxSizing: "border-box" }}>
            <style dangerouslySetInnerHTML={{__html: `
              .inv-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
              .inv-table td, .inv-table th { padding: 6px; font-size: 13.5px; word-wrap: break-word; }
              .inv-border { border: 2px solid black; }
              .inv-border td, .inv-border th { border: 1px solid black; }
              .inv-center { text-align: center; }
              .inv-right { text-align: right; }
              .inv-bold { font-weight: bold; }
              .inv-h2 { margin: 5px 0; font-size: 24px; font-weight: bold; }
              @media print {
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              }
            `}} />
            
            <div id="a4-invoice" style={{ fontFamily: "serif" }}>
              
              <div style={{ textAlign: "right", fontSize: "12px", marginBottom: "5px", lineHeight: "1.2" }}>
                Original for Recipient ( )<br/>
                Duplicate for Transporter ( )<br/>
                Triplicate for Supplier ( )
              </div>

              {/* HEADER */}
              <table className="inv-table inv-border">
                <tbody>
                  <tr>
                    <td>GST No. : {bgst}</td>
                    <td className="inv-center inv-bold">TAX INVOICE</td>
                  </tr>
                </tbody>
              </table>

              {/* COMPANY */}
              <div className="inv-center" style={{ margin: "10px 0" }}>
                <h2 className="inv-h2">{bname}</h2>
                {bdesc}<br/>
                {baddr}
              </div>

              {/* CUSTOMER + INVOICE */}
              <table className="inv-table inv-border">
                <tbody>
                  <tr>
                    <td style={{ width: "50%", verticalAlign: "top" }}>
                      <b>To</b><br/>
                      {cbizname || cname}{cbizname && cname ? <><br/><span style={{ fontSize: "12px" }}>({cname})</span></> : ''}<br/>
                      {caddr1}<br/>
                      {caddr2}<br/><br/>
                      GST No. {cgst}
                    </td>
                    <td style={{ width: "50%", verticalAlign: "top" }}>
                      Invoice No.: {inv}<br/>
                      Date: {formatDate(invdate)}<br/><br/>
                      DC No.: {dcno}<br/>
                      Order No.: {orderno}<br/>
                      Vehicle No.: {vehicle}<br/>
                      Way Bill No.: {waybill}
                    </td>
                  </tr>
                </tbody>
              </table>

              <br/>

              {/* PRODUCT TABLE */}
              <table className="inv-table inv-border">
                <thead>
                  <tr>
                    <th className="inv-center" style={{ width: "5%" }}>S No.</th>
                    <th className="inv-center" style={{ width: "60%" }}>Description</th>
                    <th className="inv-center" style={{ width: "10%" }}>HSN Code</th>
                    <th className="inv-center" style={{ width: "7%" }}>Quantity</th>
                    <th className="inv-center" style={{ width: "8%" }}>Unit Rate</th>
                    <th className="inv-center" style={{ width: "10%" }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p, i) => (
                    <tr key={p.id}>
                      <td className="inv-center" style={{ borderLeft: "1px solid black", borderRight: "1px solid black", borderBottom: "none", borderTop: "none" }}>{i + 1}</td>
                      <td style={{ borderLeft: "1px solid black", borderRight: "1px solid black", borderBottom: "none", borderTop: "none" }}>{p.desc}</td>
                      <td className="inv-center" style={{ borderLeft: "1px solid black", borderRight: "1px solid black", borderBottom: "none", borderTop: "none" }}>{p.hsn}</td>
                      <td className="inv-center" style={{ borderLeft: "1px solid black", borderRight: "1px solid black", borderBottom: "none", borderTop: "none" }}>{p.qty || ""}</td>
                      <td className="inv-center" style={{ borderLeft: "1px solid black", borderRight: "1px solid black", borderBottom: "none", borderTop: "none" }}>{p.rate || ""}</td>
                      <td className="inv-right" style={{ borderLeft: "1px solid black", borderRight: "1px solid black", borderBottom: "none", borderTop: "none" }}>{(p.qty * p.rate) > 0 ? (p.qty * p.rate).toFixed(2) : ""}</td>
                    </tr>
                  ))}

                  {/* LIMITED EMPTY SPACE: Removes extra grid lines to look clean */}
                  {Array.from({ length: Math.max(0, 10 - products.length) }).map((_, i) => (
                    <tr key={`empty-${i}`}>
                      <td style={{ borderLeft: "1px solid black", borderRight: "1px solid black", borderBottom: "none", borderTop: "none" }}>&nbsp;</td>
                      <td style={{ borderLeft: "1px solid black", borderRight: "1px solid black", borderBottom: "none", borderTop: "none" }}></td>
                      <td style={{ borderLeft: "1px solid black", borderRight: "1px solid black", borderBottom: "none", borderTop: "none" }}></td>
                      <td style={{ borderLeft: "1px solid black", borderRight: "1px solid black", borderBottom: "none", borderTop: "none" }}></td>
                      <td style={{ borderLeft: "1px solid black", borderRight: "1px solid black", borderBottom: "none", borderTop: "none" }}></td>
                      <td style={{ borderLeft: "1px solid black", borderRight: "1px solid black", borderBottom: "none", borderTop: "none" }}></td>
                    </tr>
                  ))}

                  <tr>
                    <td colSpan={5} className="inv-right inv-bold" style={{ borderTop: "2px solid black" }}>Total</td>
                    <td className="inv-right" style={{ borderTop: "2px solid black", fontWeight: "bold" }}>{subtotal.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>

              <br/>

              {/* RUPEES + TAX */}
              <table className="inv-table">
                <tbody>
                  <tr>
                    <td style={{ width: "70%", verticalAlign: "top" }}>
                      Rupees: {numberToWords(grandTotal).toUpperCase()} ONLY
                    </td>
                    <td style={{ width: "30%", verticalAlign: "top", padding: "0" }}>
                      <table className="inv-table inv-border">
                        <tbody>
                          <tr><td>CGST @{cgstRate}%</td><td className="inv-right">{cgstAmt > 0 ? cgstAmt.toFixed(2) : ""}</td></tr>
                          <tr><td>SGST @{sgstRate}%</td><td className="inv-right">{sgstAmt > 0 ? sgstAmt.toFixed(2) : ""}</td></tr>
                          <tr><td>IGST @{igstRate}%</td><td className="inv-right">{igstAmt > 0 ? igstAmt.toFixed(2) : ""}</td></tr>
                          <tr><td className="inv-bold">Grand Total</td><td className="inv-right inv-bold">{grandTotal.toFixed(2)}</td></tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                </tbody>
              </table>

              <br/>

              {/* BANK + SIGNATURE */}
              <table className="inv-table">
                <tbody>
                  <tr>
                    <td style={{ width: "60%", verticalAlign: "top" }}>
                      <b>Bank Details:</b><br/>
                      {bank}<br/>
                      {branch}<br/>
                      A/c No. {acc}<br/>
                      IFSC Code: {ifsc}
                    </td>
                    <td className="inv-right" style={{ width: "40%", verticalAlign: "bottom" }}>
                      For {bname}<br/><br/><br/><br/>
                      Authorised Signature
                    </td>
                  </tr>
                </tbody>
              </table>

            </div>
          </div>
        </>
      )}
    </div>
  );
}
