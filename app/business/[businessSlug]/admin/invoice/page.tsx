"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { Search, ChevronDown, Users, X, Truck, Lock } from "lucide-react";

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
  // Business identity fields — READ-ONLY, auto-filled from Settings DB
  const [bname, setBname] = useState("");
  const [bdesc, setBdesc] = useState("");
  const [bgst, setBgst] = useState("");
  const [baddr, setBaddr] = useState("");
  const [bphone, setBphone] = useState("");
  const [bizLoaded, setBizLoaded] = useState(false); // Track if business data loaded from DB

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

  /* ── Vehicle dropdown state ── */
  const [allVehicles, setAllVehicles] = useState<any[]>([]);
  const [showVehicleDropdown, setShowVehicleDropdown] = useState(false);
  const vehicleDropdownRef = useRef<HTMLDivElement>(null);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return allCustomers;
    const q = customerSearch.toLowerCase();
    return allCustomers.filter((c: any) =>
      c.name?.toLowerCase().includes(q) ||
      c.businessName?.toLowerCase().includes(q) ||
      c.phone?.includes(q)
    );
  }, [allCustomers, customerSearch]);

  const filteredVehicles = useMemo(() => {
    if (!vehicle.trim()) return allVehicles;
    const q = vehicle.toLowerCase();
    return allVehicles.filter((v: any) =>
      v.vehicleNumber?.toLowerCase().includes(q) ||
      v.ownerName?.toLowerCase().includes(q)
    );
  }, [allVehicles, vehicle]);

  // 0. Init: today's date + fetch customers for dropdown
  useEffect(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    setInvdate(`${yyyy}-${mm}-${dd}`);

    fetch("/api/business/customers", { cache: "no-store" })
      .then(res => res.ok ? res.json() : { data: [] })
      .then(json => {
        const list = json?.data ?? json;
        setAllCustomers(Array.isArray(list) ? list : []);
      })
      .catch(() => setAllCustomers([]));

    fetch("/api/business/vehicles", { cache: "no-store" })
      .then(res => res.ok ? res.json() : { data: [] })
      .then(json => {
        const list = json?.data ?? json;
        setAllVehicles(Array.isArray(list) ? list : []);
      })
      .catch(() => setAllVehicles([]));
  }, []);

  // 1. Fetch business identity from DB — SINGLE SOURCE OF TRUTH
  // These fields are NEVER editable on the invoice page.
  useEffect(() => {
    fetch("/api/business/info", { cache: "no-store" })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        // Always use DB values — no localStorage override for business identity
        setBname(data.name || "");
        setBaddr(data.address || "");
        setBgst(data.gstNumber || "");
        setBphone(data.phone || "");
        setBizLoaded(true);
      })
      .catch(() => {});
  }, []);

  // 2. Load per-business persisted invoice settings from localStorage
  // NOTE: Business identity (bname, bgst, baddr, bphone) is NOT loaded from localStorage.
  // Only per-invoice settings (description, tax rates, bank details) are persisted locally.
  useEffect(() => {
    if (!bizKey) return;
    const k = bizKey;

    const savedBdesc = localStorage.getItem(`inv_${k}_bdesc`);
    if (savedBdesc !== null) setBdesc(savedBdesc);

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
  // NOTE: Business identity fields are NOT saved to localStorage — DB is the only source of truth.
  useEffect(() => {
    if (!bizKey) return;
    const k = bizKey;
    localStorage.setItem(`inv_${k}_bdesc`, bdesc);
    localStorage.setItem(`inv_${k}_cgstRate`, cgstRate.toString());
    localStorage.setItem(`inv_${k}_sgstRate`, sgstRate.toString());
    localStorage.setItem(`inv_${k}_igstRate`, igstRate.toString());
    localStorage.setItem(`inv_${k}_bank`, bank);
    localStorage.setItem(`inv_${k}_branch`, branch);
    localStorage.setItem(`inv_${k}_acc`, acc);
    localStorage.setItem(`inv_${k}_ifsc`, ifsc);
  }, [bizKey, bdesc, cgstRate, sgstRate, igstRate, bank, branch, acc, ifsc]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowCustomerDropdown(false);
      }
      if (vehicleDropdownRef.current && !vehicleDropdownRef.current.contains(e.target as Node)) {
        setShowVehicleDropdown(false);
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
            {/* BUSINESS DETAILS — READ-ONLY, AUTO-FILLED FROM SETTINGS */}
            <div className="bg-[#0b1220] border border-[#1f2937] rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-bold text-[#ffd200] uppercase tracking-widest flex items-center gap-2">
                  <span className="text-base">🏢</span> Business Details
                </h3>
                <span className="text-[8px] font-bold text-[#22c55e] bg-[#22c55e]/10 px-2 py-1 rounded-md border border-[#22c55e]/20 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" /> MANAGED FROM SETTINGS
                </span>
              </div>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest flex items-center gap-2">
                    Business Name
                    <span className="text-[9px] text-[#22c55e] bg-[#22c55e]/10 px-2 py-0.5 rounded-md border border-[#22c55e]/20">Auto-filled from Settings</span>
                  </label>
                  <input value={bname} readOnly disabled tabIndex={-1}
                    className="w-full bg-[#111827] border border-[#22c55e]/20 rounded-xl px-4 py-3 text-sm font-medium text-[#f9fafb]/80 cursor-not-allowed opacity-80 focus:outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest">Description</label>
                  <input value={bdesc} onChange={(e) => setBdesc(e.target.value)}
                    className="w-full bg-[#020617] border border-[#1f2937] rounded-xl px-4 py-3 text-sm font-medium text-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest flex items-center gap-2">
                    GST Number
                    <span className="text-[9px] text-[#22c55e] bg-[#22c55e]/10 px-2 py-0.5 rounded-md border border-[#22c55e]/20">Auto-filled from Settings</span>
                  </label>
                  <input value={bgst} readOnly disabled tabIndex={-1}
                    className="w-full bg-[#111827] border border-[#22c55e]/20 rounded-xl px-4 py-3 text-sm font-medium text-[#f9fafb]/80 cursor-not-allowed opacity-80 focus:outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest flex items-center gap-2">
                    Address
                    <span className="text-[9px] text-[#22c55e] bg-[#22c55e]/10 px-2 py-0.5 rounded-md border border-[#22c55e]/20">Auto-filled from Settings</span>
                  </label>
                  <input value={baddr} readOnly disabled tabIndex={-1}
                    className="w-full bg-[#111827] border border-[#22c55e]/20 rounded-xl px-4 py-3 text-sm font-medium text-[#f9fafb]/80 cursor-not-allowed opacity-80 focus:outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest flex items-center gap-2">
                    Phone Number
                    <span className="text-[9px] text-[#22c55e] bg-[#22c55e]/10 px-2 py-0.5 rounded-md border border-[#22c55e]/20">Auto-filled from Settings</span>
                  </label>
                  <input value={bphone} readOnly disabled tabIndex={-1}
                    className="w-full bg-[#111827] border border-[#22c55e]/20 rounded-xl px-4 py-3 text-sm font-medium text-[#f9fafb]/80 cursor-not-allowed opacity-80 focus:outline-none" />
                </div>
                <p className="text-[9px] text-[#374151] flex items-center gap-1 pt-1">
                  <Lock className="w-2.5 h-2.5" />
                  To edit business details, go to Settings → Enterprise Overview
                </p>
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
                <div className="space-y-1" ref={vehicleDropdownRef}>
                  <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest">Vehicle Number</label>
                  <div className="relative">
                    <Truck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280] pointer-events-none z-10" />
                    <input value={vehicle} onChange={(e) => { setVehicle(e.target.value); setShowVehicleDropdown(true); }}
                      onFocus={() => setShowVehicleDropdown(true)}
                      placeholder="e.g. TG08V4944"
                      className="w-full bg-[#020617] border border-[#1f2937] rounded-xl pl-10 pr-10 py-3 text-sm font-medium text-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all placeholder:text-[#374151]" />
                    <ChevronDown className={`absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280] pointer-events-none transition-transform ${showVehicleDropdown ? 'rotate-180' : ''}`} />
                    {showVehicleDropdown && allVehicles.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-[#0b1220] border border-[#1f2937] rounded-xl shadow-2xl max-h-48 overflow-y-auto custom-scrollbar">
                        {filteredVehicles.length > 0 ? filteredVehicles.map((v: any) => (
                          <button
                            key={v._id}
                            type="button"
                            onClick={() => { setVehicle(v.vehicleNumber); setShowVehicleDropdown(false); }}
                            className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-[#8b5cf6]/10 transition-colors border-b border-[#1f2937]/50 last:border-0"
                          >
                            <Truck className="w-4 h-4 text-[#8b5cf6] flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-[#f9fafb] truncate">{v.vehicleNumber}</p>
                              <p className="text-[10px] text-[#6b7280] truncate">{v.ownerName}</p>
                            </div>
                          </button>
                        )) : (
                          <div className="px-4 py-3 text-center">
                            <p className="text-xs text-[#6b7280] font-medium">No matching vehicles</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
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
          <div className="mx-auto" style={{ width: "210mm", minHeight: "297mm", background: "#fff", color: "#000", boxSizing: "border-box" }}>
            <style dangerouslySetInnerHTML={{__html: `
              @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
              .inv-page { font-family: 'Inter', sans-serif; padding: 12mm 15mm; color: #1e293b; display: flex; flex-direction: column; min-height: 297mm; box-sizing: border-box; }
              
              /* Header */
              .inv-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8mm; }
              .inv-logo-box { width: 75px; height: 85px; background-color: #0f172a; clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%); display: flex; align-items: center; justify-content: center; margin-right: 20px; flex-shrink: 0; }
              .inv-logo-inner { width: 63px; height: 73px; border: 2px solid #ffffff; clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%); display: flex; align-items: center; justify-content: center; }
              .inv-logo-text { color: #ffffff; font-size: 28px; font-weight: 800; letter-spacing: -1px; }
              
              .inv-company-info { display: flex; }
              .inv-company-name { font-size: 26px; font-weight: 800; color: #0f172a; line-height: 1.1; text-transform: uppercase; }
              .inv-company-desc { font-size: 14px; font-weight: 500; color: #475569; margin-bottom: 12px; letter-spacing: 0.5px; }
              
              .inv-contact-row { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 6px; font-size: 11px; color: #334155; font-weight: 500; }
              .inv-icon { width: 14px; height: 14px; color: #0f172a; flex-shrink: 0; margin-top: 0px; }
              
              .inv-title-sec { text-align: right; }
              .inv-title { font-size: 40px; font-weight: 800; color: #0f172a; letter-spacing: 1px; line-height: 1; margin-top: -5px; }
              .inv-title-line { width: 60px; height: 2px; background: #94a3b8; margin: 10px 0 20px auto; }
              
              .inv-meta-grid { display: grid; grid-template-columns: 14px 75px 10px auto; gap: 5px 4px; align-items: center; font-size: 10.5px; font-weight: 600; text-align: left; }
              .inv-meta-val { font-weight: 400; color: #475569; }
              
              .inv-divider { height: 1px; background: #0f172a; margin: 0 0 8mm 0; width: 100%; }
              
              /* Billed To */
              .inv-billed-section { display: flex; justify-content: space-between; margin-bottom: 8mm; }
              .inv-billed-tab { display: inline-flex; align-items: center; background: #e0e7ff; padding: 6px 30px 6px 12px; border-radius: 6px 20px 20px 6px; font-weight: 700; font-size: 12px; margin-bottom: 12px; color: #0f172a; }
              .inv-billed-icon { width: 22px; height: 22px; background: #0f172a; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 10px; }
              .inv-billed-icon svg { width: 12px; height: 12px; fill: #ffffff; }
              .inv-customer-name { font-size: 16px; font-weight: 800; color: #0f172a; margin-bottom: 8px; }
              .inv-customer-address { font-size: 12px; font-weight: 500; color: #475569; line-height: 1.6; }
              
              /* Decor */
              .inv-decor-doc { width: 120px; opacity: 0.9; }
              
              /* Table */
              .inv-table { width: 100%; border-collapse: collapse; margin-bottom: 6mm; border-radius: 8px; overflow: hidden; box-shadow: 0 0 0 1px #e2e8f0; }
              .inv-table th { background: #0f172a; color: #ffffff; font-size: 10px; font-weight: 600; text-transform: uppercase; padding: 12px 10px; text-align: center; border-right: 1px solid rgba(255,255,255,0.1); }
              .inv-table th:last-child { border-right: none; }
              .inv-table td { padding: 14px 10px; font-size: 11.5px; font-weight: 500; color: #334155; text-align: center; border-bottom: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; }
              .inv-table td:last-child { border-right: none; }
              .inv-table td.desc-col { text-align: left; font-weight: 600; color: #0f172a; }
              
              /* Bottom Section */
              .inv-bottom-grid { display: flex; justify-content: space-between; align-items: stretch; gap: 25px; margin-bottom: auto; }
              
              /* Amount in Words */
              .inv-words-box { flex: 1.2; border: 1px solid #cbd5e1; border-radius: 8px; padding: 18px; display: flex; align-items: flex-start; gap: 15px; }
              .inv-rupee-circle { width: 36px; height: 36px; background: #0f172a; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: #fff; font-size: 18px; font-weight: bold; }
              .inv-words-title { font-size: 11px; font-weight: 800; color: #0f172a; margin-bottom: 6px; }
              .inv-words-text { font-size: 12px; color: #475569; font-weight: 500; line-height: 1.5; }
              
              /* Totals */
              .inv-totals-box { flex: 1; display: flex; flex-direction: column; justify-content: space-between; }
              .inv-total-row { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 10px; padding: 0 10px; color: #0f172a; font-weight: 600; }
              .inv-grand-total { background: #0f172a; color: #ffffff; border-radius: 6px; padding: 12px 15px; display: flex; justify-content: space-between; font-size: 14px; font-weight: 800; margin-top: auto; }
              
              /* Bank Details */
              .inv-bank-box { background: #f1f5f9; border-radius: 8px; padding: 15px 25px; display: flex; align-items: center; gap: 25px; margin-top: 6mm; margin-bottom: 6mm; }
              .inv-bank-icon { width: 70px; border-right: 1px solid #cbd5e1; padding-right: 25px; }
              .inv-bank-title { font-size: 11px; font-weight: 800; color: #0f172a; margin-bottom: 8px; text-transform: uppercase; }
              .inv-bank-grid { display: grid; grid-template-columns: 110px 10px auto; gap: 6px; font-size: 10.5px; font-weight: 700; color: #0f172a; }
              .inv-bank-val { font-weight: 500; color: #475569; }
              
              /* Footer */
              .inv-footer { background: #0f172a; color: #ffffff; border-radius: 8px; padding: 15px 25px; display: flex; justify-content: space-between; align-items: center; }
              .inv-footer-left { display: flex; align-items: center; gap: 18px; }
              .inv-laptop-icon { width: 40px; height: 40px; background: #ffffff; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
              .inv-footer-text { font-size: 15px; font-weight: 500; line-height: 1.4; color: #e2e8f0; }
              .inv-footer-right { display: flex; align-items: center; gap: 14px; font-size: 22px; font-weight: 700; border-left: 1px solid rgba(255,255,255,0.2); padding-left: 25px; }
              .inv-phone-circle { width: 36px; height: 36px; background: #ffffff; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: #0f172a; }
              
              @media print {
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              }
            `}} />
            
            <div id="a4-invoice" className="inv-page">
              
              {/* HEADER */}
              <div className="inv-header">
                <div className="inv-company-info">
                  <div className="inv-logo-box">
                    <div className="inv-logo-inner">
                      <span className="inv-logo-text">MB</span>
                    </div>
                  </div>
                  <div>
                    <h1 className="inv-company-name">{bname || "COMPANY NAME"}</h1>
                    <p className="inv-company-desc">{bdesc}</p>
                    <div className="inv-contact-row">
                      <svg className="inv-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                      {baddr || "Address Not Available"}
                    </div>
                    <div className="inv-contact-row">
                      <svg className="inv-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                      {bphone || "Phone Not Available"}
                    </div>
                    <div className="inv-contact-row">
                      <svg className="inv-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                      GST No. {bgst}
                    </div>
                  </div>
                </div>
                <div className="inv-title-sec">
                  <h1 className="inv-title">INVOICE</h1>
                  <div className="inv-title-line"></div>
                  <div className="inv-meta-grid">
                    <svg className="inv-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                    <span>Invoice No.</span> <span>:</span> <span className="inv-meta-val">{inv}</span>
                    
                    <svg className="inv-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                    <span>Invoice Date</span> <span>:</span> <span className="inv-meta-val">{formatDate(invdate)}</span>
                    
                    {dcno && <>
                      <svg className="inv-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                      <span>DC No.</span> <span>:</span> <span className="inv-meta-val">{dcno}</span>
                    </>}
                    
                    {orderno && <>
                      <svg className="inv-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                      <span>Order No.</span> <span>:</span> <span className="inv-meta-val">{orderno}</span>
                    </>}
                    
                    {vehicle && <>
                      <svg className="inv-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
                      <span>Vehicle No.</span> <span>:</span> <span className="inv-meta-val">{vehicle}</span>
                    </>}
                    
                    {waybill && <>
                      <svg className="inv-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                      <span>Way Bill No.</span> <span>:</span> <span className="inv-meta-val">{waybill}</span>
                    </>}
                  </div>
                </div>
              </div>
              
              <div className="inv-divider"></div>
              
              {/* BILLED TO */}
              <div className="inv-billed-section">
                <div>
                  <div className="inv-billed-tab">
                    <div className="inv-billed-icon">
                      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"></path></svg>
                    </div>
                    BILLED TO
                  </div>
                  <h2 className="inv-customer-name">{cbizname || cname} {cbizname && cname ? `(${cname})` : ''}</h2>
                  <div className="inv-customer-address">
                    {caddr1} <br/>
                    {caddr2} <br/>
                    {cgst && <>GST No: <b>{cgst}</b></>}
                  </div>
                </div>
                <div className="inv-decor-doc">
                  <svg viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="70" y="20" width="80" height="110" rx="4" stroke="#94a3b8" strokeWidth="2"/>
                    <line x1="85" y1="40" x2="135" y2="40" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"/>
                    <line x1="85" y1="55" x2="135" y2="55" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"/>
                    <line x1="85" y1="70" x2="120" y2="70" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"/>
                    <circle cx="130" cy="100" r="25" fill="#ffffff" stroke="#94a3b8" strokeWidth="2"/>
                    <text x="130" y="110" fill="#94a3b8" fontSize="24" fontWeight="bold" textAnchor="middle">₹</text>
                    <line x1="30" y1="80" x2="40" y2="80" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round"/>
                    <circle cx="50" cy="60" r="3" fill="#cbd5e1"/>
                  </svg>
                </div>
              </div>
              
              {/* TABLE */}
              <table className="inv-table">
                <thead>
                  <tr>
                    <th style={{ width: '6%' }}>#</th>
                    <th style={{ width: '42%' }}>DESCRIPTION OF GOODS / SERVICES</th>
                    <th style={{ width: '12%' }}>HSN</th>
                    <th style={{ width: '10%' }}>QTY</th>
                    <th style={{ width: '15%' }}>UNIT RATE (₹)</th>
                    <th style={{ width: '15%' }}>AMOUNT (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p, i) => (
                    <tr key={p.id}>
                      <td>{i + 1}</td>
                      <td className="desc-col">{p.desc}</td>
                      <td>{p.hsn}</td>
                      <td>{p.qty || ""}</td>
                      <td>{p.rate ? p.rate.toFixed(2) : ""}</td>
                      <td>{(p.qty * p.rate) > 0 ? (p.qty * p.rate).toFixed(2) : ""}</td>
                    </tr>
                  ))}
                  {Array.from({ length: Math.max(0, 5 - products.length) }).map((_, i) => (
                    <tr key={`empty-${i}`}>
                      <td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {/* BOTTOM SECTION */}
              <div className="inv-bottom-grid">
                <div className="inv-words-box">
                  <div className="inv-rupee-circle">₹</div>
                  <div>
                    <div className="inv-words-title">AMOUNT IN WORDS</div>
                    <div className="inv-words-text">{numberToWords(grandTotal)}</div>
                  </div>
                </div>
                <div className="inv-totals-box">
                  <div className="inv-total-row">
                    <span>Subtotal</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                  </div>
                  {cgstRate > 0 && <div className="inv-total-row">
                    <span>CGST @ {cgstRate}%</span>
                    <span>₹{cgstAmt.toFixed(2)}</span>
                  </div>}
                  {sgstRate > 0 && <div className="inv-total-row">
                    <span>SGST @ {sgstRate}%</span>
                    <span>₹{sgstAmt.toFixed(2)}</span>
                  </div>}
                  {igstRate > 0 && <div className="inv-total-row">
                    <span>IGST @ {igstRate}%</span>
                    <span>₹{igstAmt.toFixed(2)}</span>
                  </div>}
                  <div className="inv-grand-total">
                    <span>TOTAL AMOUNT</span>
                    <span>₹{grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              
              {/* BANK DETAILS */}
              <div className="inv-bank-box">
                <div className="inv-bank-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M2 21h20v2H2v-2zm10-20l10 5v2H2V6l10-5zm-1 8h2v7h-2V9zm-5 0h2v7H6V9zm10 0h2v7h-2V9z"></path></svg>
                </div>
                <div>
                  <div className="inv-bank-title">BANK DETAILS</div>
                  <div className="inv-bank-grid">
                    <span>Bank Name</span> <span>:</span> <span className="inv-bank-val">{bank || "N/A"}</span>
                    <span>A/C No.</span> <span>:</span> <span className="inv-bank-val">{acc || "N/A"}</span>
                    <span>IFSC Code</span> <span>:</span> <span className="inv-bank-val">{ifsc || "N/A"}</span>
                    <span>A/C Holder Name</span> <span>:</span> <span className="inv-bank-val">{bname || "N/A"}</span>
                  </div>
                </div>
              </div>
              
              {/* FOOTER */}
              <div className="inv-footer">
                <div className="inv-footer-left">
                  <div className="inv-laptop-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
                  </div>
                  <div className="inv-footer-text">
                    What a Business Software<br/>with this invoice?
                  </div>
                </div>
                <div className="inv-footer-right">
                  <div className="inv-phone-circle">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                  </div>
                  8125629601
                </div>
              </div>
              
            </div>
          </div>
        </>
      )}
    </div>
  );
}
