"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { UserCheck, UserX, ScanFace, WifiOff, Wifi, Users } from "lucide-react";

interface ScanResult {
    success: boolean;
    message: string;
    member?: {
        name: string;
        memberId: string;
        photoUrl?: string;
        planQuantity?: number;
        voiceAlert?: boolean;
        expiryDate?: string;
    };
    occupancy?: { current: number; capacity: number; available: number };
}

interface PendingScan {
    qrPayload: string;
    timestamp: number;
}

const COOLDOWN_MS = 3500; // slightly more than server's 3s for safety

export default function EntryPage() {
    const [scanResult, setScanResult] = useState<ScanResult | null>(null);
    const [isScanning, setIsScanning] = useState(true);
    const [loading, setLoading] = useState(false);
    const [isOnline, setIsOnline] = useState(true);
    const [pendingScans, setPendingScans] = useState<PendingScan[]>([]);
    const [occupancy, setOccupancy] = useState<{ current: number; capacity: number } | null>(null);
    const lastScanTime = useRef<number>(0);

    // ── Online / Offline detection ─────────────────────────────────────────
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);
        setIsOnline(navigator.onLine);
        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, []);

    // ── Load pending scans from localStorage ──────────────────────────────
    useEffect(() => {
        try {
            const stored = localStorage.getItem("pendingScans");
            if (stored) {
                const parsed: PendingScan[] = JSON.parse(stored);
                setPendingScans(parsed);
            }
        } catch {}
    }, []);

    // ── Fetch pool occupancy ───────────────────────────────────────────────
    const fetchOccupancy = useCallback(async () => {
        try {
            const res = await fetch("/api/settings/capacity");
            if (res.ok) {
                const data = await res.json();
                setOccupancy({ current: data.currentOccupancy, capacity: data.poolCapacity });
            }
        } catch {}
    }, []);

    useEffect(() => {
        fetchOccupancy();
        const interval = setInterval(fetchOccupancy, 15000);
        return () => clearInterval(interval);
    }, [fetchOccupancy]);

    // ── Auto-sync pending scans when back online ───────────────────────────
    useEffect(() => {
        if (!isOnline || pendingScans.length === 0) return;

        const sync = async () => {
            const remaining: PendingScan[] = [];
            for (const scan of pendingScans) {
                try {
                    const res = await fetch("/api/entry", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ qrPayload: scan.qrPayload }),
                    });
                    if (!res.ok) remaining.push(scan);
                } catch {
                    remaining.push(scan);
                }
            }
            setPendingScans(remaining);
            localStorage.setItem("pendingScans", JSON.stringify(remaining));
        };

        sync();
    }, [isOnline]);

    const getRemainingTimeText = (expiryDateStr: string) => {
        const expiry = new Date(expiryDateStr);
        const diffMs = expiry.getTime() - Date.now();
        if (diffMs <= 0) return "Expired";
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        if (diffDays > 0) return `${diffDays} days, ${diffHours} hours remaining`;
        if (diffHours > 0) return `${diffHours} hours, ${diffMins} mins remaining`;
        return `${diffMins} mins remaining`;
    };

    const handleScan = async (text: string) => {
        if (!text || loading || !isScanning) return;

        // Client-side cooldown guard
        const now = Date.now();
        if (now - lastScanTime.current < COOLDOWN_MS) return;
        lastScanTime.current = now;

        setLoading(true);
        setIsScanning(false);

        // Offline mode — queue for later
        if (!isOnline) {
            const newPending: PendingScan[] = [...pendingScans, { qrPayload: text, timestamp: now }];
            setPendingScans(newPending);
            localStorage.setItem("pendingScans", JSON.stringify(newPending));
            setScanResult({ success: false, message: "Offline — Scan Queued for Sync" });
            setLoading(false);
            setTimeout(() => { setScanResult(null); setIsScanning(true); }, 5000);
            return;
        }

        try {
            const res = await fetch("/api/entry", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ qrPayload: text }),
            });

            const data = await res.json();

            if (res.ok) {
                setScanResult({ success: true, message: "Entry Granted", member: data.member, occupancy: data.occupancy });
                if (data.occupancy) {
                    setOccupancy({ current: data.occupancy.current, capacity: data.occupancy.capacity });
                }

                if (typeof window !== "undefined" && window.speechSynthesis) {
                    const welcomeMsg = new SpeechSynthesisUtterance(`Access granted, ${data.member.name}`);
                    window.speechSynthesis.speak(welcomeMsg);
                }

                if (data.member.voiceAlert && data.member.expiryDate) {
                    const timeUntilExpiry = new Date(data.member.expiryDate).getTime() - Date.now();
                    if (timeUntilExpiry > 0) {
                        setTimeout(() => {
                            if (typeof window !== "undefined" && window.speechSynthesis) {
                                const msg = new SpeechSynthesisUtterance(
                                    `Attention, ${data.member.name}. Your swimming session has expired. Please vacate the pool immediately.`
                                );
                                window.speechSynthesis.speak(msg);
                            }
                        }, timeUntilExpiry);
                    }
                }
            } else {
                setScanResult({ success: false, message: data.error || "Entry Denied" });
            }
        } catch (err) {
            console.error(err);
            setScanResult({ success: false, message: "Network Error — Check Connection" });
        } finally {
            setLoading(false);
            setTimeout(() => { setScanResult(null); setIsScanning(true); }, 8000);
        }
    };

    const occupancyPercent = occupancy
        ? Math.min(100, Math.round((occupancy.current / occupancy.capacity) * 100))
        : 0;
    const occupancyColor =
        occupancyPercent >= 90 ? "bg-red-500" : occupancyPercent >= 70 ? "bg-yellow-500" : "bg-green-500";

    return (
        <div className="mx-auto max-w-2xl space-y-8">
            {/* Status Bar */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">QR Entry Scanner</h1>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Scan a member's QR code to log entry.</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                    {/* Online indicator */}
                    <div className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${isOnline ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>
                        {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                        {isOnline ? "Online" : "Offline"}
                    </div>
                    {/* Pending scans badge */}
                    {pendingScans.length > 0 && (
                        <div className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 px-2 py-1 rounded-full font-medium">
                            {pendingScans.length} scan{pendingScans.length > 1 ? "s" : ""} pending sync
                        </div>
                    )}
                </div>
            </div>

            {/* Pool Occupancy Bar */}
            {occupancy && (
                <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow p-4">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                            <Users className="w-4 h-4" />
                            Pool Occupancy
                        </div>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                            {occupancy.current} / {occupancy.capacity}
                            <span className="text-gray-500 dark:text-gray-400 font-normal ml-1">
                                ({occupancy.capacity - occupancy.current} available)
                            </span>
                        </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                        <div
                            className={`h-3 rounded-full transition-all duration-500 ${occupancyColor}`}
                            style={{ width: `${occupancyPercent}%` }}
                        />
                    </div>
                    {occupancyPercent >= 90 && (
                        <p className="mt-1.5 text-xs text-red-600 dark:text-red-400 font-medium">⚠ Pool is nearly full</p>
                    )}
                </div>
            )}

            <div className="overflow-hidden rounded-2xl bg-white shadow dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                <div className="p-6 sm:p-10 flex flex-col items-center">
                    <div className="w-full max-w-sm mb-8 relative rounded-xl overflow-hidden shadow-lg border-4 border-gray-100 dark:border-gray-800 bg-black aspect-square flex items-center justify-center">
                        {isScanning ? (
                            <Scanner
                                onScan={(result) => handleScan(result[0].rawValue)}
                                components={{ finder: false }}
                                sound={false}
                            />
                        ) : scanResult ? (
                            <div className={`w-full h-full flex flex-col justify-center items-center p-6 ${scanResult.success ? "bg-green-100 dark:bg-green-900" : "bg-red-100 dark:bg-red-900"}`}>
                                {scanResult.success ? (
                                    <UserCheck className="w-20 h-20 text-green-600 dark:text-green-400 mb-4" />
                                ) : (
                                    <UserX className="w-20 h-20 text-red-600 dark:text-red-400 mb-4" />
                                )}
                                <h2 className={`text-2xl font-bold text-center ${scanResult.success ? "text-green-800 dark:text-green-200" : "text-red-800 dark:text-red-200"}`}>
                                    {scanResult.message}
                                </h2>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center text-gray-500">
                                <ScanFace className="w-16 h-16 animate-pulse" />
                                <p className="mt-4 text-sm">Processing...</p>
                            </div>
                        )}
                        {isScanning && (
                            <div className="absolute inset-0 pointer-events-none">
                                <div className="w-full h-1 bg-green-500 animate-[scan_2s_ease-in-out_infinite] blur-sm absolute top-0"></div>
                            </div>
                        )}
                    </div>

                    {scanResult && scanResult.success && scanResult.member && (
                        <div className="w-full mt-6 bg-gray-50 dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 fade-in flex flex-col items-center">
                            <div className="p-4 w-full text-center border-b border-gray-200 dark:border-gray-700">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Active Member Verified</h3>
                                <p className="text-sm text-gray-500">{scanResult.member.name} — {scanResult.member.memberId}</p>
                            </div>
                            <iframe
                                src={`/api/members/${scanResult.member.memberId}/pdf?view=true#toolbar=0&navpanes=0&scrollbar=0`}
                                className="w-full h-80 bg-white"
                                title="Member ID Card Preview"
                            />
                            {scanResult.member.expiryDate && (
                                <div className="p-4 w-full text-center border-t border-gray-200 dark:border-gray-700 bg-indigo-50 dark:bg-gray-900">
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        Expires On: {new Date(scanResult.member.expiryDate).toLocaleString()}
                                    </p>
                                    <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                                        ⏱ {getRemainingTimeText(scanResult.member.expiryDate)}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes scan { 0% { top: 0; } 50% { top: 100%; } 100% { top: 0; } }
                .animate-\\[scan_2s_ease-in-out_infinite\\] { animation: scan 2s ease-in-out infinite; }
                .fade-in { animation: fadeIn 0.3s ease-in; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            ` }} />
        </div>
    );
}
