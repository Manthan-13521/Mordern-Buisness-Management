"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { UserCheck, UserX, ScanFace, WifiOff, Wifi, Users, Search, ScanLine, X } from "lucide-react";

const Scanner = dynamic(
    () => import("@yudiel/react-qr-scanner").then((mod) => mod.Scanner),
    { ssr: false, loading: () => <div className="w-full h-full flex items-center justify-center text-[#6b7280] text-sm">Loading scanner…</div> }
);


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
    const params = useParams();
    const poolSlug = params.poolSlug as string;

    const [scanResult, setScanResult] = useState<ScanResult | null>(null);
    const [isScanning, setIsScanning] = useState(false); // Camera starts paused
    const [cameraActive, setCameraActive] = useState(false); // True when user clicks "Start Scan"
    const [loading, setLoading] = useState(false);
    const [isOnline, setIsOnline] = useState(true);
    const [pendingScans, setPendingScans] = useState<PendingScan[]>([]);
    const [occupancy, setOccupancy] = useState<{ current: number; capacity: number } | null>(null);
    const recentScansRef = useRef<Map<string, number>>(new Map());

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
            const res = await fetch(poolSlug ? `/api/occupancy?poolSlug=${poolSlug}` : "/api/occupancy");
            if (res.ok) {
                const data = await res.json();
                setOccupancy({ current: data.currentOccupancy, capacity: data.capacity });
            }
        } catch {}
    }, [poolSlug]);

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

    const handleScan = async (text: string, isManual = false) => {
        if (!text || loading) return;
        if (!isManual && !isScanning) return;

        const now = Date.now();
        const lastScanForPayload = recentScansRef.current.get(text) || 0;
        
        // Prevent duplicate scans of the SAME person within 4 seconds, but allow a line of different people
        if (now - lastScanForPayload < 4000) return;
        
        // Register this new scan payload
        recentScansRef.current.set(text, now);

        setLoading(true);
        setIsScanning(false);

        if (!isOnline) {
            const newPending: PendingScan[] = [...pendingScans, { qrPayload: text, timestamp: now }];
            setPendingScans(newPending);
            localStorage.setItem("pendingScans", JSON.stringify(newPending));
            setScanResult({ success: false, message: "Offline — Scan Queued for Sync" });
            setLoading(false);
            setTimeout(() => { setScanResult(null); setIsScanning(true); }, 3000);
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
                setScanResult({ success: true, message: "Entry Granted", occupancy: data.occupancy });
                if (data.occupancy) {
                    setOccupancy({ current: data.occupancy.current, capacity: data.occupancy.capacity });
                }

                // Auto-trigger rich lookup for the right side
                if (data.member?.memberId) {
                    handleUidLookup(data.member.memberId, true);
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
            // Reactivate camera quickly so they can scan the next person (2 seconds)
            setTimeout(() => { setScanResult(null); setIsScanning(true); }, 2000);
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
    const handleUidLookup = async (overrideUid?: string, autoClear: boolean = true) => {
        const searchUid = (overrideUid || uid).trim();
        if (!searchUid) return;
        setLookupLoading(true);
        setLookupError("");
        setLookupResult(null);
        try {
            const res = await fetch(`/api/members/lookup?uid=${encodeURIComponent(searchUid)}`);
            if (res.ok) {
                const data = await res.json();
                setLookupResult(data);
                if (autoClear) {
                    setTimeout(() => setLookupResult(null), 12000);
                }
            } else {
                const err = await res.json();
                setLookupError(err.error || "Member not found");
                if (autoClear) setTimeout(() => setLookupError(""), 5000);
            }
        } catch {
            setLookupError("Network error");
            if (autoClear) setTimeout(() => setLookupError(""), 5000);
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
                    <h1 className="text-3xl font-bold tracking-tight text-[#f9fafb]">QR Entry Scanner</h1>
                    <p className="mt-1 text-sm text-[#9ca3af]">Scan a member's QR code or look up by UID.</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <div className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${isOnline ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                        {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                        {isOnline ? "Online" : "Offline"}
                    </div>
                    {pendingScans.length > 0 && (
                        <div className="text-xs bg-orange-500/10 text-orange-400 px-2 py-1 rounded-full font-medium">
                            {pendingScans.length} scan{pendingScans.length > 1 ? "s" : ""} pending sync
                        </div>
                    )}
                </div>
            </div>

            {/* Pool Occupancy Bar */}
            {occupancy && (
                <div className="rounded-2xl bg-[#0b1220] border border-[#1f2937] shadow-sm p-4">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-[#9ca3af]">
                            <Users className="w-4 h-4" />
                            Pool Occupancy
                        </div>
                        <span className="text-sm font-bold text-[#f9fafb]">
                            {occupancy.current} / {occupancy.capacity}
                            <span className="text-[#9ca3af] font-normal ml-1">
                                ({occupancy.capacity - occupancy.current} available)
                            </span>
                        </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div
                            className={`h-3 rounded-full transition-all duration-500 ${occupancyColor}`}
                            style={{ width: `${occupancyPercent}%` }}
                        />
                    </div>
                    {occupancyPercent >= 90 && (
                        <p className="mt-1.5 text-xs text-red-600 font-medium">⚠ Pool is nearly full</p>
                    )}
                </div>
            )}

            {/* Two-column layout: QR Scanner | UID Lookup */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* LEFT: QR Scanner */}
                <div className="overflow-hidden rounded-2xl bg-[#0b1220] border border-[#1f2937] shadow-sm">
                    <div className="p-6 sm:p-8 flex flex-col items-center">
                        <div className="w-full max-w-sm mb-6 relative rounded-xl overflow-hidden shadow-lg border-4 border-[#1f2937] bg-black aspect-square flex items-center justify-center">
                            {cameraActive && isScanning ? (
                                <Scanner
                                    onScan={(result) => handleScan(result[0].rawValue)}
                                    components={{ finder: false }}
                                    sound={false}
                                />
                            ) : scanResult ? (
                                <div className={`w-full h-full flex flex-col justify-center items-center p-6 ${scanResult.success ? "bg-green-500/10" : "bg-red-500/10"}`}>
                                    {scanResult.success ? (
                                        <UserCheck className="w-20 h-20 text-green-600 mb-4" />
                                    ) : (
                                        <UserX className="w-20 h-20 text-red-600 mb-4" />
                                    )}
                                    <h2 className={`text-2xl font-bold text-center ${scanResult.success ? "text-green-400" : "text-red-400"}`}>
                                        {scanResult.message}
                                    </h2>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center text-[#6b7280] gap-4">
                                    <ScanLine className="w-16 h-16 text-[#9ca3af]" />
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
                                    className="inline-flex items-center gap-2 rounded-lg bg-[#8b5cf6] hover:bg-[#7c3aed] border-0 px-5 py-2.5 text-sm font-semibold text-white shadow-sm  transition-colors">
                                    <ScanLine className="h-4 w-4" />
                                    Start Scan
                                </button>
                            ) : (
                                <button onClick={stopScanning}
                                    className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-500/100 transition-colors">
                                    <X className="h-4 w-4" />
                                    Stop Scan
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* RIGHT: UID Lookup */}
                <div className="rounded-2xl bg-[#0b1220] border border-[#1f2937] shadow-sm flex flex-col">
                    <div className="px-6 py-4 border-b border-[#1f2937]">
                        <h2 className="text-lg font-semibold text-[#f9fafb] flex items-center gap-2">
                            <Search className="h-5 w-5 text-blue-500" />
                            UID Lookup
                        </h2>
                        <p className="text-xs text-[#9ca3af] mt-0.5">Enter a member ID (e.g. M0001, MS0001) to view details</p>
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
                                        handleScan(uid.trim(), true);
                                    }
                                }}
                                placeholder="M0001 or MS0001"
                                className="flex-1 rounded-lg border border-[#1f2937] bg-[#0b1220] px-3 py-2 text-sm text-[#f9fafb] focus:ring-2 focus:ring-[#8b5cf6] focus:border-[#8b5cf6]"
                            />
                            <button onClick={() => handleUidLookup()} disabled={lookupLoading || !uid.trim()}
                                className="rounded-lg bg-[#8b5cf6] hover:bg-[#7c3aed] border-0 px-4 py-2 text-sm font-semibold text-white  disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                                {lookupLoading ? "..." : "Search"}
                            </button>
                            <button onClick={() => { handleUidLookup(); handleScan(uid.trim(), true); }} disabled={lookupLoading || !uid.trim() || isScanning}
                                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500/100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                                {lookupLoading ? "..." : "Record Entry"}
                            </button>
                        </div>
                    </div>

                    {/* Lookup Result */}
                    <div className="flex-1 px-6 pb-6">
                        {lookupError && (
                            <div className="rounded-lg bg-red-500/10/20 border border-red-500/20 p-4 text-center">
                                <UserX className="h-8 w-8 text-red-400 mx-auto mb-2" />
                                <p className="text-sm font-medium text-red-400">{lookupError}</p>
                            </div>
                        )}
                        {lookupResult && (
                            <div className="rounded-xl border border-[#1f2937] shadow-md fade-in bg-[#0b1220] relative">
                                {/* Header */}
                                <div className={`px-4 py-2 flex justify-between items-center text-white shrink-0 ${
                                    lookupResult.isDeleted ? "bg-gray-600" :
                                    lookupResult.isExpired ? "bg-red-700" :
                                    "bg-indigo-900"
                                }`}>
                                    <span className="text-xs font-bold uppercase tracking-wider">
                                        {lookupResult._source === "entertainment" ? "Entertainment ID" : "Member ID Card"}
                                    </span>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded shadow-sm ${
                                        lookupResult.isDeleted ? "bg-[#020617]0 text-white" :
                                        lookupResult.isExpired ? "bg-red-500 text-white" :
                                        "bg-green-500 text-white"
                                    }`}>
                                        {lookupResult.isDeleted ? "DELETED" : lookupResult.isExpired ? "EXPIRED" : "ACTIVE"}
                                    </span>
                                </div>
                                
                                {/* Body */}
                                <div className="p-5 flex flex-col sm:flex-row gap-6 items-center sm:items-start">
                                    {/* Photo Area */}
                                    <div className="flex-shrink-0">
                                        {lookupResult.photoUrl ? (
                                            <img src={`/api/members/${lookupResult._id}/photo`} alt="" className="h-56 w-48 object-cover border-4 border-[#1f2937] rounded-lg shadow-sm" />
                                        ) : (
                                            <div className="h-56 w-48 bg-[#0b1220] border-4 border-[#1f2937] flex items-center justify-center rounded-lg shadow-sm">
                                                <UserCheck className="h-16 w-16 text-[#6b7280]" />
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Details Area */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-xl font-bold text-[#f9fafb] truncate">
                                            {lookupResult.name.toUpperCase()}
                                        </h3>
                                        <p className="text-sm font-bold text-blue-600 mt-1">
                                            {lookupResult.memberId}
                                        </p>
                                        
                                        <div className="mt-3 space-y-1">
                                            <p className="text-xs text-[#9ca3af]">
                                                Phone: <span className="font-semibold text-[#f9fafb]">{lookupResult.phone}</span>
                                            </p>
                                            <p className="text-xs text-[#9ca3af]">
                                                Plan: <span className="font-semibold text-[#f9fafb]">{lookupResult.planId?.name ?? "N/A"}</span>
                                            </p>
                                            {lookupResult.planQuantity && lookupResult.planQuantity > 1 && (
                                                <p className="text-xs text-[#9ca3af]">
                                                    Group: <span className="font-semibold text-[#f9fafb]">{lookupResult.planQuantity}</span>
                                                </p>
                                            )}
                                            {(lookupResult.balanceAmount ?? 0) > 0 && (
                                                <p className="text-xs text-red-500 font-bold mt-2">
                                                    Balance Due: ₹{lookupResult.balanceAmount}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Footer / Expiry */}
                                <div className="bg-[#0b1220]/5 border-[#1f2937] shadow-lg px-5 py-3 border-t border-[#1f2937] flex justify-between items-center">
                                    <span className="text-xs text-[#6b7280] font-medium">Valid Till: {new Date(lookupResult.planEndDate || lookupResult.expiryDate || "").toLocaleDateString()}</span>
                                    <span className={`text-xs font-bold ${lookupResult.isExpired ? "text-red-600" : "text-blue-600"}`}>
                                        {lookupResult.isExpired ? "Expired" : `⏱ ${getRemainingTimeText(lookupResult.planEndDate || lookupResult.expiryDate || "")}`}
                                    </span>
                                </div>
                            </div>
                        )}
                        {!lookupResult && !lookupError && (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <Search className="h-10 w-10 text-[#9ca3af] dark:text-[#9ca3af] mb-3" />
                                <p className="text-sm text-[#6b7280]">Enter a member UID above to see their full details</p>
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
