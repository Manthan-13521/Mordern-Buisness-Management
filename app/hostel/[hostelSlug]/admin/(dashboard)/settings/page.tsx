"use client";

import { useEffect, useState } from "react";
import { Settings, Save, Download, HardDrive, Server, Sun, Moon, Monitor, Sparkles, Zap, ArrowRight } from "lucide-react";
import Link from "next/link";

type HostelInfo = { hostelName: string; slug: string; city: string; adminEmail: string; adminPhone?: string; isTwilioConnected: boolean; };
const INPUT = "w-full rounded-xl border border-[#1f2937] bg-[#0b1220] px-3 py-2 text-sm text-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]";
const LABEL = "block text-xs font-medium text-[#9ca3af] mb-1";

export default function SettingsPage() {
    const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
    const [info, setInfo] = useState<HostelInfo | null>(null);
    const [subStatus, setSubStatus] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

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
        fetch("/api/hostel/settings", { cache: 'no-store' }).then(r => r.json()).then(d => {
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

    const handleExcelBackup = async () => {
        setExcelLoading(true);
        try {
            const res = await fetch("/api/hostel/settings/backup/excel", { cache: 'no-store' });
            if (!res.ok) { alert("Failed to generate Excel backup"); return; }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `ts_hostels_backup_${new Date().toISOString().split("T")[0]}.xlsx`;
            document.body.appendChild(a); a.click(); a.remove();
            URL.revokeObjectURL(url);
        } catch { alert("Error generating backup"); }
        finally { setExcelLoading(false); }
    };

    const handleJsonBackup = () => { window.location.href = "/api/hostel/settings/backup/json"; };

    const handleAwsJsonBackup = async () => {
        if (!confirm("This will backup the last 1 year of JSON data to AWS S3. Continue?")) return;
        setAwsBackupLoading(true);
        try {
            const res = await fetch(`/api/hostel/settings/aws/backup-json`, { method: "POST" });
            const data = await res.json();
            if (!res.ok) { alert(`AWS Backup Failed: ${data.error || "Unknown error"}`); return; }
            alert(`✅ AWS JSON Backup Successful! File uploaded to S3.\nKey: ${data.key}`);
        } catch (error) { alert("Error triggering AWS backup request"); }
        finally { setAwsBackupLoading(false); }
    };

    const handleAwsExcelBackup = async () => {
        if (!confirm("This will backup the last 1 year of Excel data to AWS S3. Continue?")) return;
        setAwsBackupLoading(true);
        try {
            const res = await fetch(`/api/hostel/settings/aws/backup-excel`, { method: "POST" });
            const data = await res.json();
            if (!res.ok) { alert(`AWS Backup Failed: ${data.error || "Unknown error"}`); return; }
            alert(`✅ AWS Excel Backup Successful! File uploaded to S3.\nKey: ${data.key}`);
        } catch (error) { alert("Error triggering AWS backup request"); }
        finally { setAwsBackupLoading(false); }
    };

    if (loading) return <div className="py-16 text-center text-slate-400">Loading…</div>;

    return (
        <div className="space-y-8 max-w-2xl">
            <div><h1 className="text-2xl font-bold text-[#f9fafb] flex items-center gap-2"><Settings className="h-6 w-6 text-[#6b7280]"/>Settings</h1>
            <p className="text-sm text-[#6b7280]">Manage your hostel profile and account details</p></div>

            {/* Account info (read-only) */}
            <div className="rounded-2xl bg-[#0b1220] border border-[#1f2937] shadow-sm p-6 space-y-4">
                <h2 className="text-sm font-semibold text-[#9ca3af] uppercase tracking-wider">Account Overview</h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><p className="text-slate-400 text-xs">Hostel Slug</p><p className="font-mono font-medium text-[#f9fafb]">{info?.slug}</p></div>
                    <div><p className="text-slate-400 text-xs">Admin Email</p><p className="font-medium text-[#f9fafb]">{info?.adminEmail}</p></div>
                    <div><p className="text-slate-400 text-xs">WhatsApp Status</p>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${info?.isTwilioConnected ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-[#6b7280]"}`}>{info?.isTwilioConnected ? "Connected" : "Not Connected"}</span></div>
                </div>
            </div>

            {/* Subscription Section */}
            <div className="rounded-2xl border border-sky-500/20 bg-[#0b1220] shadow-sm p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                    <Zap className="w-16 h-16 text-sky-500" />
                </div>
                <h2 className="text-sm font-semibold text-[#9ca3af] uppercase tracking-wider flex items-center gap-2 mb-6">
                    <Sparkles className="h-4 w-4 text-sky-500" /> Subscription Details
                </h2>
                <div className="grid grid-cols-2 gap-y-6 gap-x-4 text-sm relative z-10">
                    <div>
                        <p className="text-[#6b7280] text-xs font-semibold uppercase tracking-wider">Current Plan</p>
                        <p className="font-bold text-[#f9fafb] mt-1 capitalize text-lg">{subStatus?.planType || "—"}</p>
                    </div>
                    <div>
                        <p className="text-[#6b7280] text-xs font-semibold uppercase tracking-wider">Status</p>
                        <div className="mt-1">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${subStatus?.status === "active" ? "bg-emerald-100 text-emerald-600" : "bg-rose-500/10 text-rose-500"}`}>
                                {subStatus?.status || "—"}
                            </span>
                        </div>
                    </div>
                    <div>
                        <p className="text-[#6b7280] text-xs font-semibold uppercase tracking-wider">Expiry Date</p>
                        <p className="font-medium text-[#f9fafb] mt-1">
                            {subStatus?.expiryDate ? (
                                <>
                                    {new Date(subStatus.expiryDate).toLocaleDateString("en-GB")}
                                    <span className={`ml-1 text-xs font-bold ${subStatus.daysLeft !== null && subStatus.daysLeft <= 7 ? "text-amber-500" : "text-emerald-500"}`}>
                                        ({subStatus.daysLeft !== null ? `${subStatus.daysLeft} days remaining` : "Expired"})
                                    </span>
                                </>
                            ) : "—"}
                        </p>
                    </div>
                    <div className="flex items-end">
                        <Link 
                            href="/select-plan"
                            className="inline-flex items-center gap-2 rounded-xl bg-sky-600 hover:bg-sky-500 px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-sky-900/20 transition-all active:scale-95"
                        >
                            Renew / Change Plan <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div>
                </div>
            </div>

            {/* Appearance */}
            <div className="rounded-2xl bg-[#0b1220] border border-[#1f2937] shadow-sm p-6">
                <h2 className="text-sm font-semibold text-[#9ca3af] uppercase tracking-wider mb-4">Appearance</h2>
                <fieldset>
                    <legend className="sr-only">Theme Preference</legend>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {(["light", "dark", "system"] as const).map((t) => (
                            <label key={t} className={`relative flex cursor-pointer rounded-xl border p-4 shadow-sm transition-all ${theme === t ? "border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500" : "border-[#1f2937] bg-[#0b1220] hover:border-[#8b5cf6]/30"}`}>
                                <input type="radio" className="sr-only" name="theme" value={t} checked={theme === t} onChange={() => handleThemeChange(t)} />
                                <span className="flex items-center gap-2 text-sm font-medium text-[#f9fafb]">
                                    {t === "light" ? <Sun className="w-4 h-4 text-amber-500" /> : t === "dark" ? <Moon className="w-4 h-4 text-indigo-400" /> : <Monitor className="w-4 h-4 text-slate-400" />}
                                    {t.charAt(0).toUpperCase() + t.slice(1)}
                                </span>
                            </label>
                        ))}
                    </div>
                </fieldset>
            </div>

            {/* Data Management */}
            <div className="rounded-2xl bg-[#0b1220] border border-[#1f2937] shadow-sm p-6 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <HardDrive className="h-5 w-5 text-blue-500"/>
                    <h2 className="text-sm font-semibold text-[#9ca3af] uppercase tracking-wider">Data Management</h2>
                </div>
                <p className="text-sm text-[#9ca3af] pb-2">
                    Export database backups directly, or push synchronized backups strictly to your AWS S3 bucket covering the last 365 days of active, vacated, and archived data.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button onClick={handleExcelBackup} disabled={excelLoading} className="inline-flex w-full justify-center items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-60 transition-colors">
                        <Download className="w-4 h-4"/>{excelLoading ? "Generating..." : "Export Excel Backup (.xlsx)"}
                    </button>
                    <button onClick={handleJsonBackup} className="inline-flex w-full justify-center items-center gap-2 rounded-xl bg-slate-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-600 transition-colors">
                        <HardDrive className="w-4 h-4"/>Export JSON Backup
                    </button>
                    <button onClick={handleAwsJsonBackup} disabled={awsBackupLoading} className="inline-flex w-full justify-center items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500/100 disabled:opacity-60 transition-colors">
                        <Server className="w-4 h-4"/>{awsBackupLoading ? "Uploading..." : "AWS JSON Backup (Last 1 Year)"}
                    </button>
                    <button onClick={handleAwsExcelBackup} disabled={awsBackupLoading} className="inline-flex w-full justify-center items-center gap-2 rounded-xl bg-[#8b5cf6] hover:bg-[#7c3aed] border-0 px-4 py-2.5 text-sm font-semibold text-white shadow-sm  disabled:opacity-60 transition-colors">
                        <Server className="w-4 h-4"/>{awsBackupLoading ? "Uploading..." : "AWS Excel Backup (Last 1 Year)"}
                    </button>
                </div>
            </div>
        </div>
    );
}
