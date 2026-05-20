"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Settings, Save, Download, HardDrive, Server, Sun, Moon, Monitor, Sparkles, Zap, ArrowRight, Building2, Check, AlertTriangle, Lock, Pencil, X } from "lucide-react";
import Link from "next/link";

type BusinessInfo = { name: string; slug: string; address: string; phone: string; gstNumber?: string; adminEmail?: string; };

const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
    useEffect(() => {
        const t = setTimeout(onClose, 4000);
        return () => clearTimeout(t);
    }, [onClose]);
    return (
        <div className={`fixed top-6 right-6 z-[9999] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border text-sm font-semibold animate-in slide-in-from-right duration-300 ${
            type === "success"
                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                : "bg-rose-500/15 border-rose-500/30 text-rose-400"
        }`}>
            {type === "success" ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            {message}
            <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100 transition-opacity">
                <X className="w-3.5 h-3.5" />
            </button>
        </div>
    );
}

export default function SettingsPage() {
    const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
    const [info, setInfo] = useState<BusinessInfo | null>(null);
    const [subStatus, setSubStatus] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    /* ── Editable business details state ── */
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState("");
    const [editPhone, setEditPhone] = useState("");
    const [editGst, setEditGst] = useState("");
    const [editAddress, setEditAddress] = useState("");
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
    const [gstError, setGstError] = useState("");
    const saveRef = useRef(false); // Prevent concurrent saves

    const applyTheme = (newTheme: "light" | "dark" | "system") => {
        const root = window.document.documentElement;
        root.classList.remove("light", "dark");
        if (newTheme === "system") {
            root.classList.add(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
        } else {
            root.classList.add(newTheme);
        }
    };

    useEffect(() => {
        const savedTheme = localStorage.getItem("theme") as "light" | "dark" | "system" | null;
        if (savedTheme) { setTheme(savedTheme); applyTheme(savedTheme); }
    }, []);

    useEffect(() => {
        fetch("/api/business/info", { cache: 'no-store' }).then(r => r.json()).then(d => {
            setInfo(d); setLoading(false);
        }).catch(() => setLoading(false));

        fetch("/api/subscription/status", { cache: 'no-store' })
            .then(r => r.json())
            .then(d => setSubStatus(d))
            .catch(() => {});
    }, []);

    const handleThemeChange = (newTheme: "light" | "dark" | "system") => {
        setTheme(newTheme); localStorage.setItem("theme", newTheme); applyTheme(newTheme);
    };

    const handleBackupPlaceholder = () => {
        alert("Backup feature for the Business module is coming soon in the next update. Please contact support for immediate manual exports.");
    };

    /* ── Start editing ── */
    const startEditing = useCallback(() => {
        if (!info) return;
        setEditName(info.name || "");
        setEditPhone(info.phone || "");
        setEditGst(info.gstNumber || "");
        setEditAddress(info.address || "");
        setGstError("");
        setIsEditing(true);
    }, [info]);

    const cancelEditing = useCallback(() => {
        setIsEditing(false);
        setGstError("");
    }, []);

    /* ── Validate GST on change ── */
    const handleGstChange = useCallback((value: string) => {
        const normalized = value.toUpperCase().trim().replace(/\s+/g, "");
        setEditGst(normalized);
        if (normalized.length === 0) {
            setGstError("");
        } else if (normalized.length !== 15) {
            setGstError("GST number must be exactly 15 characters");
        } else if (!GST_REGEX.test(normalized)) {
            setGstError("Invalid GST format. Expected: 22AAAAA0000A1Z5");
        } else {
            setGstError("");
        }
    }, []);

    /* ── Save business details ── */
    const handleSave = useCallback(async () => {
        // Prevent concurrent saves
        if (saveRef.current || saving) return;
        saveRef.current = true;
        setSaving(true);

        // Frontend validation
        if (!editName.trim()) {
            setToast({ message: "Business name cannot be empty", type: "error" });
            setSaving(false);
            saveRef.current = false;
            return;
        }
        if (gstError) {
            setToast({ message: gstError, type: "error" });
            setSaving(false);
            saveRef.current = false;
            return;
        }

        try {
            const res = await fetch("/api/business/info", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: editName.trim(),
                    phone: editPhone.trim(),
                    gstNumber: editGst.trim(),
                    address: editAddress.trim(),
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                const errorMsg = data.details?.join(", ") || data.error || "Failed to save";
                setToast({ message: errorMsg, type: "error" });
                return;
            }

            // Update local state with server response
            setInfo({
                name: data.name || "",
                slug: data.slug || "",
                address: data.address || "",
                phone: data.phone || "",
                gstNumber: data.gstNumber || "",
            });

            setIsEditing(false);
            setToast({
                message: data.changesApplied > 0
                    ? `${data.changesApplied} field${data.changesApplied > 1 ? "s" : ""} updated successfully`
                    : "No changes detected",
                type: "success"
            });
        } catch (err) {
            setToast({ message: "Network error — please try again", type: "error" });
        } finally {
            setSaving(false);
            saveRef.current = false;
        }
    }, [editName, editPhone, editGst, editAddress, gstError, saving]);

    if (loading) return <div className="py-16 text-center text-[#6b7280]">Loading…</div>;

    return (
        <div className="space-y-8 max-w-2xl">
            {/* Toast notification */}
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <div>
                <h1 className="text-2xl font-bold text-[#f9fafb] flex items-center gap-2">
                    <Settings className="h-6 w-6 text-[#6b7280]"/>
                    Settings
                </h1>
                <p className="text-sm text-[#6b7280]">Manage your business profile and enterprise configuration</p>
            </div>

            {/* ═══ Enterprise Overview — EDITABLE ═══ */}
            <div className="rounded-2xl bg-[#0b1220] border border-[#1f2937] shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-[#9ca3af] uppercase tracking-wider flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-[#8b5cf6]" />
                        Enterprise Overview
                    </h2>
                    {!isEditing ? (
                        <button
                            onClick={startEditing}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8b5cf6] hover:text-[#a78bfa] bg-[#8b5cf6]/10 hover:bg-[#8b5cf6]/20 px-3 py-1.5 rounded-lg border border-[#8b5cf6]/20 transition-all"
                        >
                            <Pencil className="w-3 h-3" /> Edit Details
                        </button>
                    ) : (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={cancelEditing}
                                disabled={saving}
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#9ca3af] hover:text-[#f9fafb] bg-[#111827] hover:bg-[#1f2937] px-3 py-1.5 rounded-lg border border-[#1f2937] transition-all disabled:opacity-40"
                            >
                                <X className="w-3 h-3" /> Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving || !!gstError}
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-[#8b5cf6] hover:bg-[#7c3aed] px-4 py-1.5 rounded-lg shadow-lg shadow-[#8b5cf6]/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {saving ? (
                                    <>
                                        <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Saving…
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-3 h-3" /> Save Changes
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>

                {!isEditing ? (
                    /* ── Read-only view ── */
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-[#6b7280] text-xs font-semibold uppercase tracking-wider">Business Name</p>
                            <p className="font-bold text-[#f9fafb] mt-1">{info?.name || "—"}</p>
                        </div>
                        <div>
                            <p className="text-[#6b7280] text-xs font-semibold uppercase tracking-wider">Business Slug</p>
                            <p className="font-mono text-[#f9fafb] mt-1">{info?.slug || "—"}</p>
                        </div>
                        <div>
                            <p className="text-[#6b7280] text-xs font-semibold uppercase tracking-wider">Phone Number</p>
                            <p className="font-medium text-[#f9fafb] mt-1">{info?.phone || "—"}</p>
                        </div>
                        <div>
                            <p className="text-[#6b7280] text-xs font-semibold uppercase tracking-wider">GST Number</p>
                            <p className="font-medium text-[#f9fafb] mt-1">{info?.gstNumber || <span className="text-[#6b7280] italic">Not set</span>}</p>
                        </div>
                        <div className="col-span-2">
                            <p className="text-[#6b7280] text-xs font-semibold uppercase tracking-wider">Address</p>
                            <p className="font-medium text-[#f9fafb] mt-1 line-clamp-2" title={info?.address}>{info?.address || "—"}</p>
                        </div>
                    </div>
                ) : (
                    /* ── Edit form ── */
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="space-y-1">
                            <label className="text-[#6b7280] text-xs font-semibold uppercase tracking-wider">Business Name <span className="text-rose-400">*</span></label>
                            <input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="w-full rounded-xl border border-[#8b5cf6]/30 bg-[#020617] px-3 py-2.5 text-sm font-medium text-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all"
                                placeholder="Enter business name"
                            />
                            {!editName.trim() && <p className="text-[9px] text-rose-400 font-medium mt-0.5">Required field</p>}
                        </div>
                        <div className="space-y-1">
                            <label className="text-[#6b7280] text-xs font-semibold uppercase tracking-wider">Business Slug</label>
                            <div className="w-full rounded-xl border border-[#1f2937] bg-[#111827] px-3 py-2.5 text-sm font-mono text-[#6b7280] cursor-not-allowed flex items-center gap-2">
                                <Lock className="w-3 h-3 text-[#374151]" />
                                {info?.slug || "—"}
                            </div>
                            <p className="text-[9px] text-[#374151] font-medium mt-0.5">Cannot be changed</p>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[#6b7280] text-xs font-semibold uppercase tracking-wider">Phone Number</label>
                            <input
                                value={editPhone}
                                onChange={(e) => setEditPhone(e.target.value)}
                                className="w-full rounded-xl border border-[#8b5cf6]/30 bg-[#020617] px-3 py-2.5 text-sm font-medium text-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all"
                                placeholder="e.g. 9876543210"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[#6b7280] text-xs font-semibold uppercase tracking-wider">GST Number</label>
                            <input
                                value={editGst}
                                onChange={(e) => handleGstChange(e.target.value)}
                                maxLength={15}
                                className={`w-full rounded-xl border bg-[#020617] px-3 py-2.5 text-sm font-medium text-[#f9fafb] focus:outline-none focus:ring-2 transition-all uppercase ${
                                    gstError ? "border-rose-500/50 focus:ring-rose-500" : "border-[#8b5cf6]/30 focus:ring-[#8b5cf6]"
                                }`}
                                placeholder="e.g. 22AAAAA0000A1Z5"
                            />
                            {gstError && <p className="text-[9px] text-rose-400 font-medium mt-0.5">{gstError}</p>}
                        </div>
                        <div className="col-span-2 space-y-1">
                            <label className="text-[#6b7280] text-xs font-semibold uppercase tracking-wider">Address</label>
                            <textarea
                                value={editAddress}
                                onChange={(e) => setEditAddress(e.target.value)}
                                rows={2}
                                className="w-full rounded-xl border border-[#8b5cf6]/30 bg-[#020617] px-3 py-2.5 text-sm font-medium text-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all resize-none"
                                placeholder="Enter business address"
                            />
                        </div>
                        <div className="col-span-2">
                            <p className="text-[10px] text-[#374151] flex items-center gap-1.5">
                                <Lock className="w-3 h-3" />
                                Changes here will auto-sync to the Invoice Generator and all official documents
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Subscription Section */}
            <div className="rounded-2xl border border-[#8b5cf6]/20 bg-[#0b1220] shadow-sm p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                    <Zap className="w-16 h-16 text-[#8b5cf6]" />
                </div>
                <h2 className="text-sm font-semibold text-[#9ca3af] uppercase tracking-wider flex items-center gap-2 mb-6">
                    <Sparkles className="h-4 w-4 text-[#8b5cf6]" /> Subscription Status
                </h2>
                <div className="grid grid-cols-2 gap-y-6 gap-x-4 text-sm relative z-10">
                    <div>
                        <p className="text-[#6b7280] text-xs font-semibold uppercase tracking-wider">Plan Level</p>
                        <p className="font-bold text-[#f9fafb] mt-1 capitalize text-lg">{subStatus?.planType || "Pro Enterprise"}</p>
                    </div>
                    <div>
                        <p className="text-[#6b7280] text-xs font-semibold uppercase tracking-wider">Account Status</p>
                        <div className="mt-1">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${subStatus?.status === "active" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"}`}>
                                {subStatus?.status || "Active"}
                            </span>
                        </div>
                    </div>
                    <div>
                        <p className="text-[#6b7280] text-xs font-semibold uppercase tracking-wider">Renews On</p>
                        <p className="font-medium text-[#f9fafb] mt-1">
                            {subStatus?.expiryDate ? (
                                <>
                                    {new Date(subStatus.expiryDate).toLocaleDateString("en-GB")}
                                    <span className={`ml-2 text-xs font-bold ${subStatus.daysLeft !== null && subStatus.daysLeft <= 7 ? "text-amber-500" : "text-emerald-400"}`}>
                                        ({subStatus.daysLeft !== null ? `${subStatus.daysLeft} days left` : "Expired"})
                                    </span>
                                </>
                            ) : "Lifetime Access"}
                        </p>
                    </div>
                    <div className="flex items-end">
                        <Link 
                            href="/select-plan"
                            className="inline-flex items-center gap-2 rounded-xl bg-[#8b5cf6] hover:bg-[#7c3aed] px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-[#8b5cf6]/20 transition-all active:scale-95"
                        >
                            Upgrade Plan <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div>
                </div>
            </div>

            {/* Appearance */}
            <div className="rounded-2xl bg-[#0b1220] border border-[#1f2937] shadow-sm p-6">
                <h2 className="text-sm font-semibold text-[#9ca3af] uppercase tracking-wider mb-4">Display Theme</h2>
                <fieldset>
                    <legend className="sr-only">Theme Preference</legend>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {(["light", "dark", "system"] as const).map((t) => (
                            <label key={t} className={`relative flex cursor-pointer rounded-xl border p-4 shadow-sm transition-all ${theme === t ? "border-[#8b5cf6] bg-[#8b5cf6]/10 ring-1 ring-[#8b5cf6]" : "border-[#1f2937] bg-[#020617] hover:border-[#8b5cf6]/30"}`}>
                                <input type="radio" className="sr-only" name="theme" value={t} checked={theme === t} onChange={() => handleThemeChange(t)} />
                                <span className="flex items-center gap-2 text-sm font-medium text-[#f9fafb]">
                                    {t === "light" ? <Sun className="w-4 h-4 text-amber-500" /> : t === "dark" ? <Moon className="w-4 h-4 text-[#8b5cf6]" /> : <Monitor className="w-4 h-4 text-[#9ca3af]" />}
                                    {t.charAt(0).toUpperCase() + t.slice(1)}
                                </span>
                            </label>
                        ))}
                    </div>
                </fieldset>
            </div>

            {/* Data Management */}
            <div className="rounded-2xl bg-[#0b1220] border border-[#1f2937] shadow-sm p-6 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-[#1f2937]">
                    <HardDrive className="h-5 w-5 text-[#8b5cf6]"/>
                    <h2 className="text-sm font-semibold text-[#9ca3af] uppercase tracking-wider">Data Management</h2>
                </div>
                <p className="text-sm text-[#9ca3af] leading-relaxed">
                    Securely export your enterprise records or synchronize with your AWS S3 bucket for long-term cold storage and auditing purposes.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button onClick={handleBackupPlaceholder} className="inline-flex w-full justify-center items-center gap-2 rounded-xl bg-emerald-600/10 border border-emerald-500/20 px-4 py-2.5 text-sm font-bold text-emerald-400 shadow-sm hover:bg-emerald-500/20 transition-all">
                        <Download className="w-4 h-4"/>Export Excel Ledger
                    </button>
                    <button onClick={handleBackupPlaceholder} className="inline-flex w-full justify-center items-center gap-2 rounded-xl bg-[#111827] border border-[#1f2937] px-4 py-2.5 text-sm font-bold text-[#f9fafb] shadow-sm hover:bg-[#1f2937] transition-all">
                        <HardDrive className="w-4 h-4"/>Export JSON Backup
                    </button>
                    <button onClick={handleBackupPlaceholder} className="inline-flex w-full justify-center items-center gap-2 rounded-xl bg-blue-600/10 border border-blue-500/20 px-4 py-2.5 text-sm font-bold text-blue-400 shadow-sm hover:bg-blue-500/20 transition-all">
                        <Server className="w-4 h-4"/>AWS Cloud Sync
                    </button>
                    <button onClick={handleBackupPlaceholder} className="inline-flex w-full justify-center items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 px-4 py-2.5 text-sm font-bold text-rose-400 shadow-sm hover:bg-rose-500/20 transition-all">
                        <Zap className="w-4 h-4"/>Emergency Snapshot
                    </button>
                </div>
            </div>
        </div>
    );
}
