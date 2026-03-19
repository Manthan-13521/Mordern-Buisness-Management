"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { UserCheck, UserX, ScanFace, WifiOff, Wifi, Users, Search, ScanLine, X } from "lucide-react";


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

interface LookupMember {
    _id: string;
    memberId: string;
    name: string;
    phone: string;
    photoUrl?: string;
    planId?: { name: string; price: number };
    planQuantity?: number;
    planEndDate?: string;
    expiryDate?: string;
    paidAmount?: number;
    balanceAmount?: number;
    paymentStatus?: string;
    isExpired?: boolean;
    isDeleted?: boolean;
    _source?: string;
}

const COOLDOWN_MS = 3500;

export default function EntryPage() {
    const [scanResult, setScanResult] = useState<ScanResult | null>(null);
    const [isScanning, setIsScanning] = useState(false); // Camera starts paused
    const [cameraActive, setCameraActive] = useState(false); // True when user clicks "Start Scan"
    const [loading, setLoading] = useState(false);
    const [isOnline, setIsOnline] = useState(true);
    const [pendingScans, setPendingScans] = useState<PendingScan[]>([]);
    const [occupancy, setOccupancy] = useState<{ current: number; capacity: number } | null>(null);
    const lastScanTime = useRef<number>(0);

    // UID Lookup state
    const [uid, setUid] = useState("");
    const [lookupResult, setLookupResult] = useState<LookupMember | null>(null);
    const [lookupLoading, setLookupLoading] = useState(false);
    const [lookupError, setLookupError] = useState("");

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
            const res = await fetch("/api/occupancy");
            if (res.ok) {
                const data = await res.json();
                setOccupancy({ current: data.currentOccupancy, capacity: data.capacity });
            }
        } catch {}
    }, []);

    useEffect(() => {
        fetchOccupancy();
        const interval = setInterval(fetchOccupancy, 10000);
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
        if (diffDays > 0) return `${diffDays} days, ${diffHours} hrs remaining`;
        if (diffHours > 0) return `${diffHours} hrs, ${diffMins} mins remaining`;
        return `${diffMins} mins remaining`;
    };

    const handleScan = async (text: string) => {
        if (!text || loading || !isScanning) return;

        const now = Date.now();
        if (now - lastScanTime.current < COOLDOWN_MS) return;
        lastScanTime.current = now;

        setLoading(true);
        setIsScanning(false);

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

    const startScanning = () => {
        setCameraActive(true);
        setIsScanning(true);
        setScanResult(null);
    };

    const stopScanning = () => {
        setCameraActive(false);
        setIsScanning(false);
    };

    // ── UID Lookup ─────────────────────────────────────────────────────────
    const handleUidLookup = async () => {
        if (!uid.trim()) return;
        setLookupLoading(true);
        setLookupError("");
        setLookupResult(null);
        try {
            const res = await fetch(`/api/members/lookup?uid=${encodeURIComponent(uid.trim())}`);
            if (res.ok) {
                const data = await res.json();
                setLookupResult(data);
            } else {
                const err = await res.json();
                setLookupError(err.error || "Member not found");
            }
        } catch {
            setLookupError("Network error");
        } finally {
            setLookupLoading(false);
        }
    };

    const occupancyPercent = occupancy
        ? Math.min(100, Math.round((occupancy.current / occupancy.capacity) * 100))
        : 0;
    const occupancyColor =
        occupancyPercent >= 90 ? "bg-red-500" : occupancyPercent >= 70 ? "bg-yellow-500" : "bg-green-500";

    return (
        <div className="space-y-6">
            {/* Status Bar */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">QR Entry Scanner</h1>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Scan a member's QR code or look up by UID.</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <div className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${isOnline ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>
                        {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                        {isOnline ? "Online" : "Offline"}
                    </div>
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

            {/* Two-column layout: QR Scanner | UID Lookup */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* LEFT: QR Scanner */}
                <div className="overflow-hidden rounded-2xl bg-white shadow dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                    <div className="p-6 sm:p-8 flex flex-col items-center">
                        <div className="w-full max-w-sm mb-6 relative rounded-xl overflow-hidden shadow-lg border-4 border-gray-100 dark:border-gray-800 bg-black aspect-square flex items-center justify-center">
                            {cameraActive && isScanning ? (
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
                                <div className="flex flex-col items-center text-gray-500 gap-4">
                                    <ScanLine className="w-16 h-16 text-gray-300 dark:text-gray-600" />
                                    <p className="text-sm text-center px-6">Click <strong>"Start Scan"</strong> below to activate the camera</p>
                                </div>
                            )}
                            {cameraActive && isScanning && (
                                <div className="absolute inset-0 pointer-events-none">
                                    <div className="w-full h-1 bg-green-500 animate-[scan_2s_ease-in-out_infinite] blur-sm absolute top-0"></div>
                                </div>
                            )}
                        </div>

                        {/* Scan Controls */}
                        <div className="flex gap-3">
                            {!cameraActive ? (
                                <button onClick={startScanning}
                                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors">
                                    <ScanLine className="h-4 w-4" />
                                    Start Scan
                                </button>
                            ) : (
                                <button onClick={stopScanning}
                                    className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-500 transition-colors">
                                    <X className="h-4 w-4" />
                                    Stop Scan
                                </button>
                            )}
                        </div>

                        {/* Scan Result Member Card */}
                        {scanResult && scanResult.success && scanResult.member && (
                            <div className="w-full mt-6 bg-gray-50 dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 fade-in flex flex-col items-center">
                                <div className="p-4 w-full text-center border-b border-gray-200 dark:border-gray-700 bg-gradient-to-b from-green-50 to-white dark:from-green-900/20 dark:to-gray-800">
                                    {scanResult.member.photoUrl ? (
                                        <img src={scanResult.member.photoUrl} alt="" className="h-16 w-16 rounded-full object-cover ring-4 ring-white mx-auto mb-3 shadow-sm" />
                                    ) : (
                                        <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center mx-auto mb-3 ring-4 ring-white shadow-sm">
                                            <span className="text-2xl font-bold text-green-700 dark:text-green-400">{scanResult.member.name.charAt(0).toUpperCase()}</span>
                                        </div>
                                    )}
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Active Member Verified</h3>
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{scanResult.member.name}</p>
                                    <p className="text-xs text-gray-500">{scanResult.member.memberId}</p>
                                </div>
                                {scanResult.member.expiryDate && (
                                    <div className="p-4 w-full text-center bg-indigo-50 dark:bg-gray-900">
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                            Expires: {new Date(scanResult.member.expiryDate).toLocaleString()}
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

                {/* RIGHT: UID Lookup */}
                <div className="rounded-2xl bg-white shadow dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex flex-col">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <Search className="h-5 w-5 text-indigo-500" />
                            UID Lookup
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Enter a member ID (e.g. M0001, MS0001) to view details</p>
                    </div>
                    <div className="px-6 py-4">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={uid}
                                onChange={e => setUid(e.target.value)}
                                onKeyDown={e => {
                                    if(e.key === "Enter") {
                                        handleUidLookup();
                                        handleScan(uid.trim());
                                    }
                                }}
                                placeholder="M0001 or MS0001"
                                className="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                            <button onClick={handleUidLookup} disabled={lookupLoading || !uid.trim()}
                                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                                {lookupLoading ? "..." : "Search"}
                            </button>
                            <button onClick={() => { handleUidLookup(); handleScan(uid.trim()); }} disabled={lookupLoading || !uid.trim() || isScanning}
                                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                                {lookupLoading ? "..." : "Record Entry"}
                            </button>
                        </div>
                    </div>

                    {/* Lookup Result */}
                    <div className="flex-1 px-6 pb-6">
                        {lookupError && (
                            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-center">
                                <UserX className="h-8 w-8 text-red-400 mx-auto mb-2" />
                                <p className="text-sm font-medium text-red-700 dark:text-red-400">{lookupError}</p>
                            </div>
                        )}
                        {lookupResult && (
                            <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden fade-in">
                                {/* Header */}
                                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-4 flex items-center gap-4">
                                    {lookupResult.photoUrl ? (
                                        <img src={lookupResult.photoUrl} alt="" className="h-14 w-14 rounded-full object-cover ring-2 ring-white/50" />
                                    ) : (
                                        <div className="h-14 w-14 rounded-full bg-white/20 flex items-center justify-center">
                                            <span className="text-xl font-bold text-white">{lookupResult.name.charAt(0).toUpperCase()}</span>
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-white font-bold text-lg">{lookupResult.name}</p>
                                        <p className="text-indigo-100 text-sm">
                                            {lookupResult.memberId}
                                            {lookupResult._source === "entertainment" && " 🎭"}
                                        </p>
                                    </div>
                                </div>
                                {/* Details */}
                                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                                    <div className="px-5 py-3 flex justify-between text-sm">
                                        <span className="text-gray-500 dark:text-gray-400">Phone</span>
                                        <span className="font-medium text-gray-900 dark:text-white">{lookupResult.phone}</span>
                                    </div>
                                    <div className="px-5 py-3 flex justify-between text-sm">
                                        <span className="text-gray-500 dark:text-gray-400">Plan</span>
                                        <span className="font-medium text-gray-900 dark:text-white">{lookupResult.planId?.name ?? "N/A"} — ₹{lookupResult.planId?.price ?? 0}</span>
                                    </div>
                                    {lookupResult.planQuantity && lookupResult.planQuantity > 1 && (
                                        <div className="px-5 py-3 flex justify-between text-sm">
                                            <span className="text-gray-500 dark:text-gray-400">Quantity</span>
                                            <span className="font-medium text-gray-900 dark:text-white">{lookupResult.planQuantity}</span>
                                        </div>
                                    )}
                                    <div className="px-5 py-3 flex justify-between text-sm">
                                        <span className="text-gray-500 dark:text-gray-400">Valid Till</span>
                                        <span className="font-medium text-gray-900 dark:text-white">
                                            {new Date(lookupResult.planEndDate || lookupResult.expiryDate || "").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                                        </span>
                                    </div>
                                    <div className="px-5 py-3 flex justify-between text-sm">
                                        <span className="text-gray-500 dark:text-gray-400">Remaining</span>
                                        <span className={`font-bold ${lookupResult.isExpired ? "text-red-600" : "text-indigo-600 dark:text-indigo-400"}`}>
                                            {lookupResult.isExpired
                                                ? "Expired"
                                                : getRemainingTimeText(lookupResult.planEndDate || lookupResult.expiryDate || "")}
                                        </span>
                                    </div>
                                    <div className="px-5 py-3 flex justify-between text-sm">
                                        <span className="text-gray-500 dark:text-gray-400">Paid</span>
                                        <span className="font-medium text-green-600">₹{lookupResult.paidAmount ?? 0}</span>
                                    </div>
                                    {(lookupResult.balanceAmount ?? 0) > 0 && (
                                        <div className="px-5 py-3 flex justify-between text-sm">
                                            <span className="text-gray-500 dark:text-gray-400">Balance Due</span>
                                            <span className="font-bold text-red-600">₹{lookupResult.balanceAmount}</span>
                                        </div>
                                    )}
                                    <div className="px-5 py-3 flex justify-between text-sm">
                                        <span className="text-gray-500 dark:text-gray-400">Status</span>
                                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                                            lookupResult.isDeleted ? "bg-gray-100 text-gray-600 ring-gray-500/20" :
                                            lookupResult.isExpired ? "bg-red-50 text-red-700 ring-red-600/20" :
                                            "bg-green-50 text-green-700 ring-green-600/20"
                                        }`}>
                                            {lookupResult.isDeleted ? "DELETED" : lookupResult.isExpired ? "EXPIRED" : "ACTIVE"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                        {!lookupResult && !lookupError && (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <Search className="h-10 w-10 text-gray-300 dark:text-gray-700 mb-3" />
                                <p className="text-sm text-gray-500">Enter a member UID above to see their full details</p>
                            </div>
                        )}
                    </div>
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
