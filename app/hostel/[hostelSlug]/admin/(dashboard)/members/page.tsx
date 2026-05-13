"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
    Users, Plus, Search, X, RefreshCw, ChevronLeft, ChevronRight,
    Pencil, Trash2, RotateCcw, Camera, Upload, UserCircle2, IndianRupee, LogOut,
} from "lucide-react";
import { useHostelBlock } from "@/components/hostel/HostelBlockContext";
import { HostelBlockFilter } from "@/components/hostel/HostelBlockFilter";

type Room = { roomNo: string; capacity: number; isOccupied: boolean; vacantCount?: number };
type Floor = { floorNo: string; rooms: Room[] };
type Block = { name: string; floors: Floor[] };
type Member = {
    _id: string; memberId: string; name: string; phone: string; collegeName?: string;
    blockNo: string; floorNo: string; roomNo: string; bedNo: number; planId: any;
    rent_amount: number; due_date: string; balance: number;
    isActive: boolean; notes?: string; photoUrl?: string; status: "active" | "vacated";
};
type Plan = { _id: string; name: string; durationDays: number; price: number };

const INPUT =
    "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition";
const LABEL = "block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide";
const EMPTY_FORM = {
    name: "", phone: "", collegeName: "", blockNo: "", floorNo: "", roomNo: "", bedNo: "",
    planId: "", paymentMode: "cash", paidAmount: "", notes: "",
};

export default function MembersPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { selectedBlock: blockFilter } = useHostelBlock();
    const [members, setMembers] = useState<Member[]>([]);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [blocks, setBlocks] = useState<Block[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editMember, setEditMember] = useState<Member | null>(null);
    const [renewMember, setRenewMember] = useState<Member | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    // Form state
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [renewForm, setRenewForm] = useState({ planId: "", paidAmount: "", paymentMode: "cash", notes: "" });

    // Photo state
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string>("");
    const [showCamera, setShowCamera] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // Dynamic room vacancy state
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loadingRooms, setLoadingRooms] = useState(false);
    const [roomDropdownOpen, setRoomDropdownOpen] = useState(false);

    const limit = 11;

    const fetchMembers = useCallback(async () => {
        setLoading(true);
        const blockParam = blockFilter && blockFilter !== "all" ? `&block=${encodeURIComponent(blockFilter)}` : "";
        const res = await fetch(`/api/hostel/members?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}${blockParam}`);
        const data = await res.json();
        setMembers(data.data || []);
        setTotal(data.total || 0);
        setLoading(false);
    }, [page, search, blockFilter]);

    useEffect(() => { fetchMembers(); }, [fetchMembers]);
    // Reset to page 1 when block filter changes
    useEffect(() => { setPage(1); }, [blockFilter]);

    useEffect(() => {
        fetch("/api/hostel/plans", { cache: 'no-store' }).then(r => r.json()).then(d => setPlans(d.data || []));
        fetch("/api/hostel/hostel-settings", { cache: 'no-store' }).then(r => r.json()).then(d => setBlocks(d.blocks || []));
    }, []);

    const handleCheckout = async (member: any) => {
        if (member.balance < 0) {
            alert(`Pay full amount! Cannot checkout ${member.name} with a negative balance (due: ₹${Math.abs(member.balance)}).`);
            return;
        }
        if (!confirm(`Are you sure you want to checkout ${member.name}? They will be formally checked out and archived.`)) return;

        try {
            const res = await fetch(`/api/hostel/members/${member._id}/checkout`, { method: "POST" });
            if (res.ok) fetchMembers();
            else {
                const data = await res.json();
                alert(data.error || "Failed to checkout");
            }
        } catch(e) { console.error(e); }
    };

    // Check URL parameters for pre-filling form from Map Overview
    useEffect(() => {
        if (searchParams.get("openAdd") === "true") {
            setForm({
                ...EMPTY_FORM,
                blockNo: searchParams.get("blockNo") || "",
                floorNo: searchParams.get("floorNo") || "",
                roomNo: searchParams.get("roomNo") || "",
                bedNo: searchParams.get("bedNo") || "",
            });
            setShowForm(true);
            // Clear params from URL so it doesn't pop open on refresh
            router.replace("members");
        }
    }, [searchParams, router]);

    // Cascade: when block+floor changes, load vacancy
    useEffect(() => {
        if (!form.blockNo || !form.floorNo) { setRooms([]); return; }
        setLoadingRooms(true);
        fetch(`/api/hostel/rooms?block=${encodeURIComponent(form.blockNo)}&floor=${encodeURIComponent(form.floorNo)}`)
            .then(r => r.json())
            .then(d => { setRooms(d.rooms || []); setLoadingRooms(false); })
            .catch(() => setLoadingRooms(false));
    }, [form.blockNo, form.floorNo]);

    // Compute balance from selected plan
    const selectedPlan = plans.find(p => p._id === form.planId);
    const planPrice = selectedPlan?.price ?? 0;
    const balance = planPrice - (Number(form.paidAmount) || 0);

    // Auto-calc expiry from plan duration
    const expiryDate = selectedPlan
        ? (() => { const d = new Date(); d.setDate(d.getDate() + selectedPlan.durationDays); return d.toLocaleDateString("en-IN"); })()
        : "";

    const openAdd = () => {
        setEditMember(null);
        setForm({ ...EMPTY_FORM });
        setPhotoFile(null); setPhotoPreview(""); setRooms([]);
        setError(""); setShowForm(true);
    };
    const openEdit = (m: any) => {
        setEditMember(m);
        // Extract block and derived floor from block_room_no (e.g., A-101-1)
        const blockParts = (m.block_room_no || "").split("-");
        const parsedBlock = blockParts[0] || "";
        const parsedRoom = blockParts[1] || m.roomNo || "";
        let parsedFloor = "";
        if (parsedRoom) {
            const floorNum = Math.floor(parseInt(parsedRoom) / 100);
            if (!isNaN(floorNum)) parsedFloor = String(floorNum);
        }
        setForm({ name: m.name, phone: m.phone, collegeName: m.collegeName || "", blockNo: parsedBlock, floorNo: parsedFloor, roomNo: parsedRoom, bedNo: (m as any).bedNo || "", planId: m.planId?._id || m.planId, paymentMode: "cash", paidAmount: "", notes: m.notes || "" });
        setPhotoFile(null); setPhotoPreview(m.photoUrl || "");
        setError(""); setShowForm(true);
    };

    // Camera helpers
    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
            streamRef.current = stream;
            if (videoRef.current) videoRef.current.srcObject = stream;
            setShowCamera(true);
        } catch { setError("Camera access denied"); }
    };

    const stopCamera = () => {
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        setShowCamera(false);
    };

    const capturePhoto = () => {
        if (!canvasRef.current || !videoRef.current) return;
        const ctx = canvasRef.current.getContext("2d");
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        ctx?.drawImage(videoRef.current, 0, 0);
        canvasRef.current.toBlob((blob) => {
            if (!blob) return;
            const file = new File([blob], "captured.jpg", { type: "image/jpeg" });
            setPhotoFile(file);
            setPhotoPreview(URL.createObjectURL(file));
            stopCamera();
        }, "image/jpeg", 0.9);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setPhotoFile(file);
        setPhotoPreview(URL.createObjectURL(file));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setSubmitting(true); setError("");
        try {
            const fd = new FormData();
            Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)));
            fd.append("paidAmount", String(Number(form.paidAmount) || 0));
            if (photoFile) fd.append("photo", photoFile);

            const url = editMember ? `/api/hostel/members/${editMember._id}` : "/api/hostel/members";
            const method = editMember ? "PUT" : "POST";

            // Use JSON for edit (no photo change needed), FormData for new member with photo
            let res: Response;
            if (photoFile || (!editMember && !photoFile)) {
                // Always FormData for POST so photo can be attached
                res = await fetch(url, { method, body: fd });
            } else {
                res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, paidAmount: Number(form.paidAmount) }) });
            }

            const data = await res.json();
            if (!res.ok) { setError(typeof data.error === "string" ? data.error : (data.error?.message || JSON.stringify(data.error) || "Failed")); setSubmitting(false); return; }
            setShowForm(false); stopCamera(); fetchMembers();
        } catch { setError("Network error"); }
        setSubmitting(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this member? This action is irreversible.")) return;
        try {
            const res = await fetch(`/api/hostel/members/${id}`, { method: "DELETE" });
            const data = await res.json();
            if (!res.ok) {
                alert(data.error || "Failed to delete member.");
                return;
            }
            fetchMembers();
        } catch (e) {
            alert("Network error. Please try again.");
        }
    };

    const handleRenew = async (e: React.FormEvent) => {
        e.preventDefault(); if (!renewMember) return; setSubmitting(true); setError("");
        const res = await fetch(`/api/hostel/payments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                memberId: renewMember._id, 
                amount: Math.min(Number(renewForm.paidAmount), 9999999999),
                paymentMethod: renewForm.paymentMode,
                notes: renewForm.notes,
                idempotencyKey: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString()
            }),
        });
        const data = await res.json();
        if (!res.ok) { setError(typeof data.error === "string" ? data.error : (data.error?.message || JSON.stringify(data.error) || "Payment failed")); setSubmitting(false); return; }
        setRenewMember(null); fetchMembers(); setSubmitting(false);
    };

    const totalPages = Math.ceil(total / limit);

    // Floors for selected block
    const selectedBlock = blocks.find(b => b.name === form.blockNo);
    const floors = selectedBlock?.floors || [];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-[#f9fafb] flex items-center gap-2">
                        <Users className="h-6 w-6 text-blue-500" />Members
                    </h1>
                    <p className="text-sm text-slate-500">{total} total members</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            className="pl-9 pr-4 py-2 rounded-xl border border-white/10 bg-white/5 text-sm w-52 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Search members…"
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1); }}
                        />
                    </div>
                    <button onClick={fetchMembers} className="p-2 rounded-xl border border-slate-200 dark:border-slate-600 hover:bg-[#8b5cf6]/5">
                        <RefreshCw className="h-4 w-4 text-slate-500" />
                    </button>
                    <HostelBlockFilter />
                    <button onClick={openAdd} className="flex items-center gap-1.5 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 border-0 hover:bg-blue-50 dark:hover:bg-blue-500/100 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow transition">
                        <Plus className="h-4 w-4" />Add Member
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="rounded-2xl bg-slate-900 border border-white/5 shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-slate-950/50 backdrop-blur-md text-xs text-slate-400 uppercase tracking-wider">
                            <tr>
                                {["Photo", "Name / Room", "Rent", "Next Due", "Balance", "Status", "Actions"].map(h => (
                                    <th key={h} className="text-left px-4 py-3 whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 bg-[#0b1220]">
                            {loading ? Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i}>{Array.from({ length: 7 }).map((_, j) => (
                                    <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" /></td>
                                ))}</tr>
                            )) : members.length === 0 ? (
                                <tr><td colSpan={7} className="px-4 py-16 text-center text-slate-400">No members found. Add your first member!</td></tr>
                            ) : members.map(m => {
                                return (
                                    <tr key={m._id} className="hover:bg-white/5 transition">
                                        <td className="px-4 py-3">
                                            {m.photoUrl ? (
                                                <img src={m.photoUrl} alt={m.name} className="h-9 w-9 rounded-full object-cover border-2 border-indigo-200 dark:border-indigo-800" />
                                            ) : (
                                                <div className="h-9 w-9 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                                                    <UserCircle2 className="h-5 w-5 text-indigo-400" />
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-semibold text-slate-800 dark:text-slate-100">{m.name}</div>
                                            <div className="text-xs text-slate-400 font-mono">{(m as any).block_room_no || m.roomNo}</div>
                                        </td>
                                        <td className="px-4 py-3 text-slate-500 font-mono">₹{(m.rent_amount || 0).toLocaleString()}</td>
                                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{m.due_date ? new Date(m.due_date).toLocaleDateString("en-IN") : "—"}</td>
                                        <td className="px-4 py-3">
                                            {m.balance > 0 ? (
                                                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
                                                    Advance: <IndianRupee className="h-3 w-3" />{m.balance.toLocaleString("en-IN")}
                                                </span>
                                            ) : m.balance < 0 ? (
                                                <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-semibold text-xs">
                                                    Due: <IndianRupee className="h-3 w-3" />{Math.abs(m.balance).toLocaleString("en-IN")}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-slate-400 font-medium italic">Cleared</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${m.status === "vacated" ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400" : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"}`}>
                                                {m.status === "vacated" ? "Vacated" : "Active"}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => openEdit(m)} title="Edit" className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/10 dark:hover:bg-indigo-900/20 text-blue-500 transition"><Pencil className="h-3.5 w-3.5" /></button>
                                                <button onClick={() => { setRenewMember(m); setRenewForm({ planId: m.planId?._id || "", paidAmount: "", paymentMode: "cash", notes: "" }); setError(""); }} title="Renew" className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-500 transition"><RotateCcw className="h-3.5 w-3.5" /></button>
                                                <button onClick={() => handleCheckout(m)} title="Checkout" className="p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 text-amber-500 transition"><LogOut className="h-3.5 w-3.5" /></button>
                                                <button onClick={() => handleDelete(m._id)} title="Delete" className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition"><Trash2 className="h-3.5 w-3.5" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-700 text-sm text-slate-500">
                    <span>Page {page} of {totalPages || 1}</span>
                    <div className="flex gap-2">
                        <button 
                            disabled={page <= 1} 
                            onClick={() => setPage(p => p - 1)} 
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors font-medium shadow-sm"
                        >
                            <ChevronLeft className="h-4 w-4"/> Previous
                        </button>
                        <button 
                            disabled={page >= totalPages} 
                            onClick={() => setPage(p => p + 1)} 
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 border-0 text-white hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 dark:disabled:bg-slate-800 dark:disabled:text-slate-600 transition-colors shadow-sm font-medium"
                        >
                            Next <ChevronRight className="h-4 w-4"/>
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Add / Edit Modal — two-column: left fields, right photo ── */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setShowForm(false); stopCamera(); }} />
                    <div className="relative w-full max-w-3xl bg-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-white/10">
                        {/* Modal header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f2937] flex-shrink-0">
                            <h2 className="text-lg font-bold text-[#f9fafb]">{editMember ? "Edit Member" : "Add New Member"}</h2>
                            <button onClick={() => { setShowForm(false); stopCamera(); }} className="p-1.5 rounded-lg hover:bg-[#8b5cf6]/5 transition"><X className="h-5 w-5 text-slate-400" /></button>
                        </div>

                        {/* Modal body — two columns */}
                        {blocks.length === 0 ? (
                            <div className="p-12 text-center flex flex-col items-center">
                                <p className="text-[#9ca3af] mb-4">No hostel structure found. You must configure blocks, floors, and rooms first.</p>
                                <a href="hostel-settings" className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 border-0 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-50 dark:hover:bg-blue-500/100">Go to Settings</a>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
                                {error && <div className="mx-6 mt-4 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-xl px-4 py-2.5">{error}</div>}
                                <div className="grid grid-cols-1 md:grid-cols-5 gap-0 p-6">
                                    {/* ── Left: form fields (3/5) ── */}
                                    <div className="md:col-span-3 md:pr-6 space-y-4 md:border-r border-[#1f2937]">
                                        <p className="text-xs font-bold text-blue-500 uppercase tracking-widest">Member Details</p>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className={LABEL}>Full Name *</label>
                                                <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={INPUT} placeholder="e.g. Rahul Sharma" />
                                            </div>
                                            <div>
                                                <label className={LABEL}>Phone *</label>
                                                <input required value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className={INPUT} placeholder="+91 98765 43210" />
                                            </div>
                                        </div>

                                        <div>
                                            <label className={LABEL}>College Name (optional)</label>
                                            <input value={form.collegeName} onChange={e => setForm(p => ({ ...p, collegeName: e.target.value }))} className={INPUT} placeholder="e.g. IIT Bombay" />
                                        </div>

                                        <div className="grid grid-cols-3 gap-3">
                                            {/* Block dropdown */}
                                            <div>
                                                <label className={LABEL}>Block *</label>
                                                <select required value={form.blockNo} onChange={e => setForm(p => ({ ...p, blockNo: e.target.value, floorNo: "", roomNo: "" }))} className={INPUT}>
                                                    <option value="">Select…</option>
                                                    {blocks.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
                                                </select>
                                            </div>

                                            {/* Floor dropdown */}
                                            <div>
                                                <label className={LABEL}>Floor *</label>
                                                <select required value={form.floorNo} onChange={e => setForm(p => ({ ...p, floorNo: e.target.value, roomNo: "" }))} disabled={!form.blockNo} className={INPUT}>
                                                    <option value="">Select…</option>
                                                    {floors.map(f => <option key={f.floorNo} value={f.floorNo}>Floor {f.floorNo}</option>)}
                                                </select>
                                            </div>

                                            {/* Room dropdown with vacancy inline (Custom Scrollable UI) */}
                                            <div className="relative">
                                                <label className={LABEL}>Room *</label>
                                                <div 
                                                    className={`${INPUT} flex justify-between items-center cursor-pointer ${(!form.floorNo || loadingRooms) ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800' : ''}`}
                                                    onClick={() => !(!form.floorNo || loadingRooms) && setRoomDropdownOpen(!roomDropdownOpen)}
                                                >
                                                    <span>{form.roomNo ? `Room ${form.roomNo}${form.bedNo ? ` - Bed ${form.bedNo}` : ''}` : (loadingRooms ? "Loading…" : "Select…")}</span>
                                                    <span className="text-slate-400 text-xs">▼</span>
                                                </div>
                                                
                                                {roomDropdownOpen && (
                                                    <div className="absolute z-10 w-full mt-1 bg-[#0b1220] border border-[#1f2937] rounded-xl shadow-lg max-h-60 overflow-y-auto">
                                                        {rooms.length === 0 ? (
                                                            <div className="px-3 py-2 text-sm text-slate-500">No rooms</div>
                                                        ) : (
                                                            rooms.map(r => (
                                                                <div
                                                                    key={r.roomNo}
                                                                    onClick={() => {
                                                                        if (!r.isOccupied) {
                                                                            setForm(p => ({ ...p, roomNo: r.roomNo, bedNo: "" })); // Clear specific bed if manually swapping rooms
                                                                            setRoomDropdownOpen(false);
                                                                        }
                                                                    }}
                                                                    className={`px-3 py-2 text-sm flex justify-between border-b border-slate-100 dark:border-slate-700/50 last:border-0 ${r.isOccupied ? 'bg-[#020617]/50 text-slate-400 cursor-not-allowed' : 'hover:bg-blue-50 dark:hover:bg-blue-500/10 dark:hover:bg-indigo-900/30 cursor-pointer text-[#f9fafb]'}`}
                                                                >
                                                                    <span className="font-medium">{r.roomNo}</span>
                                                                    <span className="text-xs">
                                                                        {r.isOccupied ? 'full (disabled)' : `vacant: ${r.vacantCount ?? 0}`}
                                                                    </span>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                )}
                                                {/* Hidden input to satisfy required prop in form submit */}
                                                <input type="hidden" required value={form.roomNo} />
                                            </div>
                                        </div>

                                        {!editMember && (
                                            <>
                                                <p className="text-xs font-bold text-blue-500 uppercase tracking-widest pt-1">Plan & Payment</p>
                                                <div>
                                                    <label className={LABEL}>Plan *</label>
                                                    <select required value={form.planId} onChange={e => setForm(p => ({ ...p, planId: e.target.value }))} className={INPUT}>
                                                        <option value="">Select plan…</option>
                                                        {plans.map(p => <option key={p._id} value={p._id}>{p.name} — ₹{p.price} / {p.durationDays}d</option>)}
                                                    </select>
                                                </div>

                                                {selectedPlan && (
                                                    <div className="rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/40 px-4 py-2.5 flex items-center justify-between text-sm">
                                                        <span className="text-[#9ca3af]">Next Due Date (calculated)</span>
                                                        <span className="font-semibold text-indigo-700 dark:text-indigo-300">{expiryDate}</span>
                                                    </div>
                                                )}

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className={LABEL}>Payment Mode</label>
                                                        <select value={form.paymentMode} onChange={e => setForm(p => ({ ...p, paymentMode: e.target.value }))} className={INPUT}>
                                                            <option value="cash">Cash</option>
                                                            <option value="upi">UPI</option>
                                                            <option value="card">Card</option>
                                                            <option value="bank_transfer">Bank Transfer</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className={LABEL}>Paid Amount (₹)</label>
                                                        <input type="number" min="0" max="9999999999" value={form.paidAmount} onChange={e => setForm(p => ({ ...p, paidAmount: e.target.value }))} className={INPUT} placeholder="0" />
                                                    </div>
                                                </div>

                                                {/* Balance — read-only, server also recalculates */}
                                                {selectedPlan && (
                                                    <div className={`rounded-xl px-4 py-2.5 text-sm flex items-center justify-between border ${balance > 0 ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/40" : "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800/40"}`}>
                                                        <span className="text-[#9ca3af] font-medium">Initial Balance (₹)</span>
                                                        <span className={`font-bold ${balance > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-orange-600 dark:text-orange-400"}`}>
                                                            {balance > 0 ? `+${balance}` : balance}
                                                        </span>
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        <div>
                                            <label className={LABEL}>Notes</label>
                                            <textarea rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className={INPUT} placeholder="Any additional notes…" />
                                        </div>
                                    </div>

                                    {/* ── Right: photo box (2/5) ── */}
                                    <div className="md:col-span-2 md:pl-6 flex flex-col items-center gap-4 mt-6 md:mt-0">
                                        <p className="text-xs font-bold text-blue-500 uppercase tracking-widest self-start">Member Photo</p>

                                        {/* Preview area */}
                                        <div className="w-full aspect-[3/4] rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 overflow-hidden flex items-center justify-center relative">
                                            {showCamera ? (
                                                <div className="absolute inset-0">
                                                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                                                    <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-3">
                                                        <button type="button" onClick={capturePhoto} className="bg-white text-slate-800 rounded-full px-4 py-1.5 text-xs font-bold shadow-lg">Capture</button>
                                                        <button type="button" onClick={stopCamera} className="bg-red-500 text-white rounded-full px-4 py-1.5 text-xs font-bold shadow-lg">Cancel</button>
                                                    </div>
                                                </div>
                                            ) : photoPreview ? (
                                                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="flex flex-col items-center gap-2 text-slate-400">
                                                    <UserCircle2 className="h-16 w-16" />
                                                    <p className="text-xs">No photo</p>
                                                </div>
                                            )}
                                            <canvas ref={canvasRef} className="hidden" />
                                        </div>

                                        {/* Photo actions */}
                                        <div className="flex gap-2 w-full">
                                            <button type="button" onClick={startCamera} className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium border border-slate-300 dark:border-slate-600 rounded-xl py-2 hover:bg-[#8b5cf6]/5 transition">
                                                <Camera className="h-3.5 w-3.5" />Camera
                                            </button>
                                            <button type="button" onClick={() => fileInputRef.current?.click()} className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium border border-slate-300 dark:border-slate-600 rounded-xl py-2 hover:bg-[#8b5cf6]/5 transition">
                                                <Upload className="h-3.5 w-3.5" />Upload
                                            </button>
                                            {photoPreview && (
                                                <button type="button" onClick={() => { setPhotoFile(null); setPhotoPreview(""); }} className="p-2 rounded-xl text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition"><X className="h-4 w-4" /></button>
                                            )}
                                        </div>
                                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                                        <p className="text-[11px] text-slate-400 text-center">Take a photo with your camera or upload from device. Supports JPG, PNG, WebP.</p>
                                    </div>
                                </div>

                                {/* Submit */}
                                <div className="px-6 pb-6 flex-shrink-0">
                                    <button type="submit" disabled={submitting} className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 border-0 hover:bg-blue-50 dark:hover:bg-blue-500/100 text-white font-bold py-3 rounded-xl shadow-lg transition disabled:opacity-50 text-sm tracking-wide">
                                        {submitting ? "Saving…" : editMember ? "Update Member" : "Add Member"}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* ── Payment Modal ── */}
            {renewMember && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setRenewMember(null)} />
                    <div className="relative bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-white">Add Payment — {renewMember.name}</h2>
                            <button onClick={() => setRenewMember(null)} className="p-1.5 rounded-lg hover:bg-white/10 transition"><X className="h-5 w-5 text-slate-400" /></button>
                        </div>
                        <div className="rounded-xl bg-white/5 border border-white/5 px-4 py-3 text-xs space-y-1 text-slate-400">
                            <div className="flex justify-between"><span>Room</span><span className="font-semibold text-[#f9fafb]">{(renewMember as any).block_room_no || renewMember.roomNo}</span></div>
                            <div className="flex justify-between"><span>Current Balance</span><span className={`font-semibold ${renewMember.balance >= 0 ? "text-emerald-500" : "text-red-500"}`}>₹{renewMember.balance.toLocaleString()}</span></div>
                            <div className="flex justify-between"><span>Next Due</span><span className="font-semibold text-blue-500">{renewMember.due_date ? new Date(renewMember.due_date).toLocaleDateString("en-IN") : "—"}</span></div>
                        </div>
                        {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{error}</p>}
                        <form onSubmit={handleRenew} className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={LABEL}>Payment Mode</label>
                                    <select value={renewForm.paymentMode} onChange={e => setRenewForm(p => ({ ...p, paymentMode: e.target.value }))} className={INPUT}>
                                        <option value="cash">Cash</option>
                                        <option value="upi">UPI</option>
                                        <option value="card">Card</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={LABEL}>Amount (₹) *</label>
                                    <input type="number" min="0" max="9999999999" required value={renewForm.paidAmount} onChange={e => setRenewForm(p => ({ ...p, paidAmount: e.target.value }))} className={INPUT} placeholder="0" />
                                </div>
                            </div>
                            <div>
                                <label className={LABEL}>Notes</label>
                                <input type="text" value={renewForm.notes} onChange={e => setRenewForm(p => ({ ...p, notes: e.target.value }))} className={INPUT} placeholder="Optional payment note" />
                            </div>
                            <button type="submit" disabled={submitting} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition disabled:opacity-50 text-sm">
                                {submitting ? "Processing…" : "Record Payment"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
