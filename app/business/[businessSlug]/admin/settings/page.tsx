"use client";

import { useEffect, useState } from "react";
import { Settings, Save, Download, HardDrive, Server, Sun, Moon, Monitor, Sparkles, Zap, ArrowRight, Building2 } from "lucide-react";
import Link from "next/link";

type BusinessInfo = { name: string; slug: string; address: string; phone: string; adminEmail?: string; };
const INPUT = "w-full rounded-xl border border-[#1f2937] bg-[#0b1220] px-3 py-2 text-sm text-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]";
const LABEL = "block text-xs font-medium text-[#9ca3af] mb-1";

export default function SettingsPage() {
    const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
    const [info, setInfo] = useState<BusinessInfo | null>(null);
    const [subStatus, setSubStatus] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const [excelLoading, setExcelLoading] = useState(false);
    const [awsBackupLoading, setAwsBackupLoading] = useState(false);

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

    if (loading) return <div className="py-16 text-center text-[#6b7280]">Loading…</div>;

    return (
        <div className="space-y-8 max-w-2xl">
            <div>
                <h1 className="text-2xl font-bold text-[#f9fafb] flex items-center gap-2">
                    <Settings className="h-6 w-6 text-[#6b7280]"/>
                    Settings
                </h1>
                <p className="text-sm text-[#6b7280]">Manage your business profile and enterprise configuration</p>
            </div>

            {/* Account info (read-only) */}
            <div className="rounded-2xl bg-[#0b1220] border border-[#1f2937] shadow-sm p-6 space-y-4">
                <h2 className="text-sm font-semibold text-[#9ca3af] uppercase tracking-wider flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-[#8b5cf6]" />
                    Enterprise Overview
                </h2>
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
                        <p className="text-[#6b7280] text-xs font-semibold uppercase tracking-wider">Address</p>
                        <p className="font-medium text-[#f9fafb] mt-1 line-clamp-1" title={info?.address}>{info?.address || "—"}</p>
                    </div>
                </div>
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
