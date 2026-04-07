"use client";

import { useState, useEffect } from "react";
import { Save, HardDrive, Moon, Sun, Monitor, Download, Users, Activity, Server, Zap, ArrowRight, Sparkles } from "lucide-react";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import Link from "next/link";


export default function SettingsPage() {
    const { data: session } = useSession();
    const isAdmin = session?.user?.role === "admin" || session?.user?.role === "superadmin";
    const params = useParams();
    const poolSlug = params.poolSlug as string;

    const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
    const [subStatus, setSubStatus] = useState<any>(null);
    const [poolInfo, setPoolInfo] = useState<{ slug: string; adminEmail: string; isTwilioConnected: boolean } | null>(null);
    const [poolCapacity, setPoolCapacity] = useState<number>(50);
    const [currentOccupancy, setCurrentOccupancy] = useState<number>(0);
    const [occupancyDurationMinutes, setOccupancyDurationMinutes] = useState<number>(60);
    const [capacityLoading, setCapacityLoading] = useState(false);
    const [capacitySaved, setCapacitySaved] = useState(false);
    const [excelLoading, setExcelLoading] = useState(false);
    const [deletedExcelLoading, setDeletedExcelLoading] = useState(false);
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
        if (!isAdmin || !poolSlug) return;
        fetch(`/api/settings/capacity?poolSlug=${poolSlug}`)
            .then(r => r.json())
            .then(d => { 
                setPoolCapacity(d.poolCapacity ?? 50); 
                setCurrentOccupancy(d.currentOccupancy ?? 0); 
                setOccupancyDurationMinutes(d.occupancyDurationMinutes ?? 60); 
                if (d.pool) setPoolInfo(d.pool);
            })
            .catch(() => {});

        fetch("/api/subscription/status")
            .then(r => r.json())
            .then(d => setSubStatus(d))
            .catch(() => {});
    }, [isAdmin, poolSlug]);

    const handleThemeChange = (newTheme: "light" | "dark" | "system") => {
        setTheme(newTheme); localStorage.setItem("theme", newTheme); applyTheme(newTheme);
    };

    const handleCapacitySave = async () => {
        setCapacityLoading(true);
        try {
            const res = await fetch(`/api/settings/capacity?poolSlug=${poolSlug}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ poolCapacity, currentOccupancy, occupancyDurationMinutes }),
            });
            if (res.ok) { setCapacitySaved(true); setTimeout(() => setCapacitySaved(false), 3000); }
        } finally { setCapacityLoading(false); }
    };

    const handleJsonBackup = () => { window.location.href = "/api/settings/backup"; };

    const handleExcelBackup = async () => {
        setExcelLoading(true);
        try {
            const res = await fetch("/api/settings/backup/excel");
            if (!res.ok) { alert("Failed to generate Excel backup"); return; }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `ts_pools_backup_${new Date().toISOString().split("T")[0]}.xlsx`;
            document.body.appendChild(a); a.click(); a.remove();
            URL.revokeObjectURL(url);
        } catch { alert("Error generating backup"); }
        finally { setExcelLoading(false); }
    };

    const handleAwsJsonBackup = async () => {
        if (!confirm("This will backup the last 1 year of JSON data to AWS S3. Continue?")) return;
        setAwsBackupLoading(true);
        try {
            const res = await fetch(`/api/settings/aws/backup-json`, { method: "POST" });
            const data = await res.json();
            if (!res.ok) { alert(`AWS Backup Failed: ${data.error || "Unknown error"}`); return; }
            alert(`✅ AWS JSON Backup Successful! File uploaded to S3.\nKey: ${data.key}`);
        } catch (error) {
            alert("Error triggering AWS backup request");
        } finally {
            setAwsBackupLoading(false);
        }
    };

    const handleAwsExcelBackup = async () => {
        if (!confirm("This will backup the last 1 year of Excel data to AWS S3. Continue?")) return;
        setAwsBackupLoading(true);
        try {
            const res = await fetch(`/api/settings/aws/backup-excel`, { method: "POST" });
            const data = await res.json();
            if (!res.ok) { alert(`AWS Backup Failed: ${data.error || "Unknown error"}`); return; }
            alert(`✅ AWS Excel Backup Successful! File uploaded to S3.\nKey: ${data.key}`);
        } catch (error) {
            alert("Error triggering AWS backup request");
        } finally {
            setAwsBackupLoading(false);
        }
    };

    return (
        <div className="space-y-10 max-w-4xl">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Manage system preferences, pool capacity, and data backups.
                </p>
            </div>

            {/* Account Overview */}
            <div className="grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-3">
                <div>
                    <h2 className="text-base font-semibold leading-7 text-gray-900 dark:text-white">Account Overview</h2>
                    <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-400">Essential account and system details.</p>
                </div>
                <div className="md:col-span-2">
                    <div className="rounded-xl border border-white/10 bg-slate-900 p-6 shadow-lg">
                        <div className="grid grid-cols-2 gap-y-6 gap-x-4 text-sm">
                            <div>
                                <p className="text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider">Pool Slug</p>
                                <p className="font-mono font-medium text-white mt-1">{poolInfo?.slug || "—"}</p>
                            </div>
                            <div>
                                <p className="text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider">Admin Email</p>
                                <p className="font-medium text-white mt-1">{poolInfo?.adminEmail || "—"}</p>
                            </div>
                            <div>
                                <p className="text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider">WhatsApp Status</p>
                                <div className="mt-1">
                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${poolInfo?.isTwilioConnected ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20" : "bg-white/5 text-gray-400 ring-1 ring-white/10"}`}>
                                        {poolInfo?.isTwilioConnected ? "Connected" : "Not Connected"}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <hr className="border-gray-200 dark:border-gray-800" />

            {/* Subscription Section */}
            <div className="grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-3">
                <div>
                    <h2 className="text-base font-semibold leading-7 text-gray-900 dark:text-white flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-sky-500" /> Subscription
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-400">Manage your SaaS licensing and billing.</p>
                </div>
                <div className="md:col-span-2">
                    <div className="rounded-xl border border-sky-500/20 bg-slate-900 p-6 shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Zap className="w-20 h-20 text-sky-500" />
                        </div>
                        <div className="grid grid-cols-2 gap-y-6 gap-x-4 text-sm relative z-10">
                            <div>
                                <p className="text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider">Current Plan</p>
                                <p className="font-bold text-white mt-1 capitalize text-lg">{subStatus?.planType || "—"}</p>
                            </div>
                            <div>
                                <p className="text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider">Status</p>
                                <div className="mt-1">
                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold uppercase tracking-wider ${subStatus?.status === "active" ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20" : "bg-red-500/10 text-red-400 ring-1 ring-red-500/20"}`}>
                                        {subStatus?.status || "—"}
                                    </span>
                                </div>
                            </div>
                            <div>
                                <p className="text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider">Expiry Date</p>
                                <p className="font-medium text-white mt-1">
                                    {subStatus?.expiryDate ? (
                                        <>
                                            {new Date(subStatus.expiryDate).toLocaleDateString("en-GB")}
                                            <span className={`ml-1 text-xs font-bold ${subStatus.daysLeft !== null && subStatus.daysLeft <= 7 ? "text-amber-400" : "text-emerald-400"}`}>
                                                ({subStatus.daysLeft !== null ? `${subStatus.daysLeft} days remaining` : "Expired"})
                                            </span>
                                        </>
                                    ) : "—"}
                                </p>
                            </div>
                            <div className="flex items-end">
                                <Link 
                                    href="/select-plan"
                                    className="inline-flex items-center gap-2 rounded-lg bg-sky-600 hover:bg-sky-500 px-4 py-2 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-sky-900/20 transition-all active:scale-95"
                                >
                                    Renew / Change Plan <ArrowRight className="w-3 h-3" />
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <hr className="border-gray-200 dark:border-gray-800" />

            {/* Appearance */}
            <div className="grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-3">
                <div>
                    <h2 className="text-base font-semibold leading-7 text-gray-900 dark:text-white">Appearance</h2>
                    <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-400">Customize how the application looks.</p>
                </div>
                <div className="md:col-span-2">
                    <div className="rounded-xl border border-white/10 bg-slate-900 p-6 shadow-lg">
                        <fieldset>
                            <legend className="text-sm font-semibold leading-6 text-gray-900 dark:text-white">Theme Preference</legend>
                            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {(["light", "dark", "system"] as const).map((t) => (
                                    <label key={t} className={`relative flex cursor-pointer rounded-lg border p-4 shadow-sm transition-all ${theme === t ? "border-blue-500 bg-blue-500/10 ring-1 ring-blue-500" : "border-white/10 bg-white/5 hover:bg-white/10"}`}>
                                        <input type="radio" className="sr-only" name="theme" value={t} checked={theme === t} onChange={() => handleThemeChange(t)} />
                                        <span className="flex items-center gap-2 text-sm font-medium text-white">
                                            {t === "light" ? <Sun className="w-5 h-5 text-yellow-500" /> : t === "dark" ? <Moon className="w-5 h-5 text-indigo-400" /> : <Monitor className="w-5 h-5 text-gray-400" />}
                                            {t.charAt(0).toUpperCase() + t.slice(1)}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </fieldset>
                    </div>
                </div>
            </div>

            <hr className="border-gray-200 dark:border-gray-800" />

            {isAdmin && (
                <>
                    {/* Pool Capacity */}
                    <div className="grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-3">
                        <div>
                            <h2 className="text-base font-semibold leading-7 text-gray-900 dark:text-white flex items-center gap-2">
                                <Users className="w-5 h-5 text-blue-500" /> Pool Capacity
                            </h2>
                            <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-400">
                                Set maximum swimmer capacity. Entry will be blocked when the pool is full.
                            </p>
                        </div>
                        <div className="md:col-span-2">
                            <div className="rounded-xl border border-white/10 bg-slate-900 p-6 shadow-lg space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">Maximum Capacity</label>
                                        <input
                                            type="number"
                                            min={1}
                                            max={1000}
                                            value={poolCapacity}
                                            onChange={(e) => setPoolCapacity(parseInt(e.target.value) || 50)}
                                            className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">Current Occupancy (manual reset)</label>
                                        <input
                                            type="number"
                                            min={0}
                                            value={currentOccupancy}
                                            onChange={(e) => setCurrentOccupancy(parseInt(e.target.value) || 0)}
                                            className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                                        />
                                    </div>
                                    <div className="col-span-2 sm:col-span-1 border-t sm:border-t-0 pt-4 sm:pt-0 border-white/5">
                                        <label className="block text-sm font-medium text-gray-300 mb-1">Occupancy Duration (minutes)</label>
                                        <p className="text-xs text-slate-500 mb-2">Auto-checkout time for daily/monthly plans</p>
                                        <input
                                            type="number"
                                            min={1}
                                            value={occupancyDurationMinutes}
                                            onChange={(e) => setOccupancyDurationMinutes(parseInt(e.target.value) || 60)}
                                            className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={handleCapacitySave}
                                        disabled={capacityLoading}
                                        className="inline-flex items-center gap-2 rounded-md bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 border-0 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-50 dark:hover:bg-blue-500/100 disabled:opacity-60 transition-colors"
                                    >
                                        <Save className="w-4 h-4" />
                                        {capacityLoading ? "Saving..." : "Save Capacity"}
                                    </button>
                                    {capacitySaved && <span className="text-sm text-green-600 dark:text-green-400 font-medium">✓ Saved!</span>}
                                </div>
                            </div>
                        </div>
                    </div>

                    <hr className="border-gray-200 dark:border-gray-800" />

                    {/* Data Backup */}
                    <div className="grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-3">
                        <div>
                            <h2 className="text-base font-semibold leading-7 text-gray-900 dark:text-white flex items-center gap-2">
                                <HardDrive className="w-5 h-5 text-blue-500" /> Data Management
                            </h2>
                            <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-400">
                                Export database backups to your local device or directly push securely synchronized data strictly adhering to a 1-year retention window to AWS S3.
                            </p>
                        </div>
                        <div className="md:col-span-2">
                            <div className="rounded-xl border border-white/10 bg-slate-900 p-6 shadow-lg space-y-4">
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Database Backup & Sync</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 pb-2">
                                    Local exports download directly to your computer. AWS backups securely sync to your dedicated S3 cloud storage.
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <button
                                        onClick={handleExcelBackup}
                                        disabled={excelLoading}
                                        className="inline-flex w-full justify-center items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 disabled:opacity-60 transition-colors"
                                    >
                                        <Download className="w-4 h-4" />
                                        {excelLoading ? "Generating..." : "Export Excel Backup (.xlsx)"}
                                    </button>
                                    <button
                                        onClick={handleJsonBackup}
                                        className="inline-flex w-full justify-center items-center gap-2 rounded-md bg-gray-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-600 transition-colors"
                                    >
                                        <HardDrive className="w-4 h-4" />
                                        Export JSON Backup
                                    </button>
                                    <button
                                        onClick={handleAwsJsonBackup}
                                        disabled={awsBackupLoading}
                                        className="inline-flex w-full justify-center items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-60 transition-colors"
                                    >
                                        <Server className="w-4 h-4" />
                                        {awsBackupLoading ? "Uploading..." : "AWS JSON Backup (Last 1 Year)"}
                                    </button>
                                    <button
                                        onClick={handleAwsExcelBackup}
                                        disabled={awsBackupLoading}
                                        className="inline-flex w-full justify-center items-center gap-2 rounded-md bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 border-0 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-50 dark:hover:bg-blue-500/100 disabled:opacity-60 transition-colors"
                                    >
                                        <Server className="w-4 h-4" />
                                        {awsBackupLoading ? "Uploading..." : "AWS Excel Backup (Last 1 Year)"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
