"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
    Plus, Image as ImageIcon, Video as VideoIcon, Trash2, Edit2, Loader2, X,
    LayoutGrid, Sidebar, PanelTop, PanelBottom, Maximize, BarChart, List,
    Search, CheckCheck, Sparkles, AlertTriangle, Monitor, Tablet, Smartphone,
    TrendingUp, Eye, MousePointerClick, ChevronDown, ChevronUp, Zap, Target
} from "lucide-react";
import Image from "next/image";
import toast from "react-hot-toast";
import {
    AD_SLOT_LABELS, AD_SLOT_LIST, SLOT_GROUPS, SLOT_CONFIGS,
    type AdSlotName
} from "@/lib/ad-slots";

// ─── Icon map for slot cards ────────────────────────────────────────────────
const SLOT_ICONS: Record<string, any> = {
    LayoutGrid, Sidebar, PanelTop, PanelBottom, Maximize, BarChart, List,
};

// ─── Recommended slots (sorted by typical high-performance) ─────────────────
const RECOMMENDED_SLOTS: AdSlotName[] = ["dashboard-inline", "top-strip", "members-inline"];

// ─── Status config ──────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    draft: { label: "Draft", color: "text-[#9ca3af]", bg: "bg-[#374151]/20 border-[#374151]" },
    scheduled: { label: "Scheduled", color: "text-[#3b82f6]", bg: "bg-[#3b82f6]/20 border-[#3b82f6]" },
    active: { label: "Active", color: "text-[#10b981]", bg: "bg-[#10b981]/20 border-[#10b981]" },
    paused: { label: "Paused", color: "text-[#f59e0b]", bg: "bg-[#f59e0b]/20 border-[#f59e0b]" },
    expired: { label: "Expired", color: "text-[#ef4444]", bg: "bg-[#ef4444]/20 border-[#ef4444]" },
    archived: { label: "Archived", color: "text-[#6b7280]", bg: "bg-[#6b7280]/20 border-[#6b7280]" },
};

// ─── Helpers ────────────────────────────────────────────────────────────────
function getSlotConflictWarning(selectedSlots: string[]): string | null {
    const activeConflicts: string[] = [];
    const groupMap = new Map<string, string[]>();

    for (const slot of selectedSlots) {
        const config = SLOT_CONFIGS[slot as AdSlotName];
        if (!config) continue;
        for (const group of config.conflictGroups) {
            if (!groupMap.has(group)) groupMap.set(group, []);
            groupMap.get(group)!.push(AD_SLOT_LABELS[slot as AdSlotName] || slot);
        }
    }

    for (const [group, slots] of groupMap.entries()) {
        if (slots.length > 1) {
            activeConflicts.push(`${slots.join(" & ")} conflict (${group})`);
        }
    }

    return activeConflicts.length > 0 ? activeConflicts.join(". ") : null;
}

function getDeviceBadges(slot: AdSlotName) {
    const config = SLOT_CONFIGS[slot];
    const badges: { icon: any; label: string }[] = [];
    if (config.desktopVisible) badges.push({ icon: Monitor, label: "Desktop" });
    if (config.mobileVisible) badges.push({ icon: Smartphone, label: "Mobile" });
    if (!config.desktopVisible && !config.mobileVisible) badges.push({ icon: Tablet, label: "Tablet" });
    return badges;
}

// ─── SlotCard Component ─────────────────────────────────────────────────────
function SlotCard({
    slot,
    isSelected,
    isRecommended,
    onToggle,
}: {
    slot: AdSlotName;
    isSelected: boolean;
    isRecommended: boolean;
    onToggle: () => void;
}) {
    const config = SLOT_CONFIGS[slot];
    const IconComponent = SLOT_ICONS[config.iconName] || LayoutGrid;
    const deviceBadges = getDeviceBadges(slot);

    return (
        <button
            type="button"
            onClick={onToggle}
            className={`
                relative w-full text-left rounded-xl border-2 p-4 transition-all duration-300 group
                ${isSelected
                    ? "border-[#8b5cf6] bg-[#8b5cf6]/10 shadow-lg shadow-[#8b5cf6]/10 ring-1 ring-[#8b5cf6]/30"
                    : "border-[#1e293b] bg-[#0b1220] hover:border-[#334155] hover:bg-[#0f172a]"
                }
            `}
        >
            {/* Selected checkmark */}
            {isSelected && (
                <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-[#8b5cf6] flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                </div>
            )}

            {/* Recommended badge */}
            {isRecommended && (
                <div className="absolute -top-2 left-3 px-2 py-0.5 text-[9px] font-bold uppercase bg-gradient-to-r from-[#f59e0b] to-[#f97316] text-white rounded-full tracking-wider flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" />
                    Recommended
                </div>
            )}

            {/* Icon + Name */}
            <div className="flex items-start gap-3 mb-3">
                <div className={`p-2 rounded-lg transition-colors ${isSelected ? "bg-[#8b5cf6]/20 text-[#8b5cf6]" : "bg-[#1e293b] text-[#9ca3af] group-hover:text-white"}`}>
                    <IconComponent className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className={`text-sm font-bold truncate ${isSelected ? "text-white" : "text-[#e2e8f0]"}`}>
                        {AD_SLOT_LABELS[slot]}
                    </p>
                    <p className="text-[11px] text-[#9ca3af] mt-0.5 line-clamp-2">{config.description}</p>
                </div>
            </div>

            {/* Device badges + capabilities */}
            <div className="flex items-center gap-1.5 flex-wrap">
                {deviceBadges.map(({ icon: DeviceIcon, label }) => (
                    <span key={label} className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-semibold uppercase rounded bg-[#1e293b] text-[#9ca3af] border border-[#1e293b]">
                        <DeviceIcon className="w-2.5 h-2.5" />
                        {label}
                    </span>
                ))}
                {config.supportsVideo && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-semibold uppercase rounded bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/20">
                        <VideoIcon className="w-2.5 h-2.5" />
                        Video
                    </span>
                )}
                {config.supportsCarousel && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-semibold uppercase rounded bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20">
                        Carousel
                    </span>
                )}
            </div>

            {/* Aspect ratio hint */}
            <div className="mt-2 text-[10px] text-[#6b7280]">
                {config.recommendedAspectRatio} · Max {config.maxAdsPerSlot} ad{config.maxAdsPerSlot > 1 ? "s" : ""}
            </div>
        </button>
    );
}

// ─── Slot Analytics Panel ───────────────────────────────────────────────────
function SlotAnalyticsPanel({ slotAnalytics }: { slotAnalytics: any[] }) {
    if (!slotAnalytics || slotAnalytics.length === 0) {
        return (
            <div className="text-center py-6 text-[#6b7280] text-sm">
                No slot-level analytics available yet.
            </div>
        );
    }

    const sorted = [...slotAnalytics].sort((a, b) => b.impressions - a.impressions);
    const topSlot = sorted[0];

    return (
        <div className="space-y-4">
            {/* Top Performing Slot */}
            <div className="bg-gradient-to-r from-[#8b5cf6]/10 to-[#3b82f6]/10 border border-[#8b5cf6]/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-[#8b5cf6]" />
                    <span className="text-xs font-bold text-[#8b5cf6] uppercase tracking-wider">Top Performing Slot</span>
                </div>
                <p className="text-lg font-bold text-white">
                    {AD_SLOT_LABELS[topSlot.slotName as AdSlotName] || topSlot.slotName}
                </p>
                <p className="text-sm text-[#9ca3af]">
                    {topSlot.impressions.toLocaleString()} impressions · {((topSlot.ctr || 0) * 100).toFixed(1)}% CTR
                </p>
            </div>

            {/* Per-slot breakdown */}
            <div className="space-y-2">
                {sorted.map((s) => {
                    const ctr = s.impressions > 0 ? (s.clicks / s.impressions) * 100 : 0;
                    const maxImpressions = sorted[0]?.impressions || 1;
                    const barWidth = Math.max(4, (s.impressions / maxImpressions) * 100);

                    return (
                        <div key={s.slotName} className="bg-[#0b1220] border border-[#1e293b] rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-bold text-white">
                                    {AD_SLOT_LABELS[s.slotName as AdSlotName] || s.slotName}
                                </p>
                                <span className={`text-xs font-bold ${ctr > 2 ? "text-[#10b981]" : ctr > 0.5 ? "text-[#f59e0b]" : "text-[#9ca3af]"}`}>
                                    {ctr.toFixed(1)}% CTR
                                </span>
                            </div>

                            {/* Bar */}
                            <div className="w-full h-1.5 bg-[#1e293b] rounded-full overflow-hidden mb-2">
                                <div
                                    className="h-full bg-gradient-to-r from-[#8b5cf6] to-[#3b82f6] rounded-full transition-all duration-500"
                                    style={{ width: `${barWidth}%` }}
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-2 text-[10px]">
                                <div className="flex items-center gap-1 text-[#9ca3af]">
                                    <Eye className="w-3 h-3" />
                                    <span>{(s.impressions || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex items-center gap-1 text-[#9ca3af]">
                                    <MousePointerClick className="w-3 h-3" />
                                    <span>{(s.clicks || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex items-center gap-1 text-[#9ca3af]">
                                    <X className="w-3 h-3" />
                                    <span>{(s.dismissals || 0).toLocaleString()}</span>
                                </div>
                            </div>

                            {/* Device breakdown */}
                            {s.deviceAnalytics && (
                                <div className="flex items-center gap-3 mt-2 pt-2 border-t border-[#1e293b]">
                                    {(["desktop", "tablet", "mobile"] as const).map(device => {
                                        const DevIcon = device === "desktop" ? Monitor : device === "tablet" ? Tablet : Smartphone;
                                        const imp = s.deviceAnalytics[device]?.impressions || 0;
                                        return (
                                            <div key={device} className="flex items-center gap-1 text-[10px] text-[#6b7280]">
                                                <DevIcon className="w-3 h-3" />
                                                <span>{imp.toLocaleString()}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function AdsPage() {
    const [ads, setAds] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [isUploadingVideo, setIsUploadingVideo] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [slotSearch, setSlotSearch] = useState("");
    const [expandedAnalytics, setExpandedAnalytics] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        _id: "",
        title: "",
        description: "",
        imageUrl: "",
        videoUrl: "",
        targetUrl: "",
        ctaText: "Learn More",
        type: "native",
        placementSlots: [] as string[],
        designMode: "standard",
        status: "active" as string,
        deliveryStrategy: "single" as string,
        startDate: "",
        endDate: "",
        targetModules: [] as string[],
        targetPages: [] as string[],
        targetOrganizations: "",
        targetPlans: "",
        targetCities: "",
        targetRoles: "",
        displayIntervalMinutes: 30,
        frequencyCap: 0,
        priority: 0,
    });

    const modules = ["pool", "hostel", "business"];
    const pages = ["dashboard", "members", "staff", "entry", "overview", "customers", "labour", "payments", "analytics"];

    useEffect(() => { fetchAds(); }, []);

    const fetchAds = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/superadmin/ads");
            if (res.ok) setAds(await res.json());
        } catch (error) { console.error(error); }
        setIsLoading(false);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isVideo: boolean) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const maxMb = isVideo ? 20 : 5;
        if (file.size > maxMb * 1024 * 1024) {
            toast.error(`File size must be less than ${maxMb}MB.`);
            e.target.value = "";
            return;
        }
        const setter = isVideo ? setIsUploadingVideo : setIsUploadingImage;
        setter(true);
        const toastId = toast.loading(`Uploading ${isVideo ? "video" : "image"}...`);
        const reader = new FileReader();
        reader.onloadend = async () => {
            try {
                const res = await fetch("/api/superadmin/upload", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ file: reader.result as string }),
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.url) {
                        setFormData(prev => ({ ...prev, [isVideo ? "videoUrl" : "imageUrl"]: data.url }));
                        toast.success("Upload successful!", { id: toastId });
                    }
                } else {
                    const data = await res.json();
                    toast.error(data.error || "Upload failed.", { id: toastId });
                }
            } catch {
                toast.error("Upload failed.", { id: toastId });
            } finally {
                setter(false);
            }
        };
        reader.readAsDataURL(file);
    };

    // ─── Slot conflict validation ───────────────────────────────────────
    const slotConflictWarning = useMemo(
        () => getSlotConflictWarning(formData.placementSlots),
        [formData.placementSlots]
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.imageUrl) { toast.error("Please upload a fallback image."); return; }
        if (formData.placementSlots.length === 0) { toast.error("Select at least one placement slot."); return; }
        if (slotConflictWarning) { toast.error("Fix slot conflicts before saving."); return; }

        setIsSaving(true);
        const toastId = toast.loading(formData._id ? "Updating campaign..." : "Launching campaign...");
        try {
            const url = formData._id ? `/api/superadmin/ads/${formData._id}` : "/api/superadmin/ads";
            const method = formData._id ? "PUT" : "POST";
            const payload = {
                ...formData,
                targetOrganizations: formData.targetOrganizations ? formData.targetOrganizations.split(",").map(s => s.trim()) : [],
                targetPlans: formData.targetPlans ? formData.targetPlans.split(",").map(s => s.trim()) : [],
                targetCities: formData.targetCities ? formData.targetCities.split(",").map(s => s.trim()) : [],
                targetRoles: formData.targetRoles ? formData.targetRoles.split(",").map(s => s.trim()) : [],
            };
            if (!payload._id) delete (payload as any)._id;

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                toast.success(formData._id ? "Campaign updated!" : "Campaign launched!", { id: toastId });
                setIsModalOpen(false);
                fetchAds();
            } else {
                const data = await res.json();
                toast.error(data.error || "Failed to save.", { id: toastId });
            }
        } catch {
            toast.error("Failed to save.", { id: toastId });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this campaign?")) return;
        const toastId = toast.loading("Deleting...");
        try {
            const res = await fetch(`/api/superadmin/ads/${id}`, { method: "DELETE" });
            if (res.ok) { toast.success("Deleted!", { id: toastId }); fetchAds(); }
            else toast.error("Failed to delete.", { id: toastId });
        } catch { toast.error("Failed to delete.", { id: toastId }); }
    };

    const openCreateModal = () => {
        setFormData({
            _id: "",
            title: "",
            description: "",
            imageUrl: "",
            videoUrl: "",
            targetUrl: "",
            ctaText: "Learn More",
            type: "native",
            placementSlots: [],
            designMode: "standard",
            status: "active",
            deliveryStrategy: "single",
            startDate: new Date().toISOString().slice(0, 16),
            endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
            targetModules: ["business"],
            targetPages: ["dashboard"],
            targetOrganizations: "",
            targetPlans: "",
            targetCities: "",
            targetRoles: "",
            displayIntervalMinutes: 30,
            frequencyCap: 0,
            priority: 0,
        });
        setSlotSearch("");
        setIsModalOpen(true);
    };

    const openEditModal = (ad: any) => {
        setFormData({
            ...ad,
            // Legacy migration: placementSlot -> placementSlots
            placementSlots: ad.placementSlots && ad.placementSlots.length > 0
                ? ad.placementSlots
                : ad.placementSlot ? [ad.placementSlot] : [],
            // Legacy migration: isActive -> status
            status: ad.status || (ad.isActive ? "active" : "paused"),
            deliveryStrategy: ad.deliveryStrategy || "single",
            targetOrganizations: ad.targetOrganizations?.join(", ") || "",
            targetPlans: ad.targetPlans?.join(", ") || "",
            targetCities: ad.targetCities?.join(", ") || "",
            targetRoles: ad.targetRoles?.join(", ") || "",
            startDate: new Date(ad.startDate).toISOString().slice(0, 16),
            endDate: new Date(ad.endDate).toISOString().slice(0, 16),
        });
        setSlotSearch("");
        setIsModalOpen(true);
    };

    const toggleArrayItem = (array: string[], item: string, key: "targetModules" | "targetPages") => {
        if (array.includes(item)) {
            setFormData({ ...formData, [key]: array.filter((i) => i !== item) });
        } else {
            setFormData({ ...formData, [key]: [...array, item] });
        }
    };

    const toggleSlot = (slot: string) => {
        setFormData(prev => ({
            ...prev,
            placementSlots: prev.placementSlots.includes(slot)
                ? prev.placementSlots.filter(s => s !== slot)
                : [...prev.placementSlots, slot],
        }));
    };

    const selectAllSlots = () => {
        setFormData(prev => ({ ...prev, placementSlots: [...AD_SLOT_LIST] }));
    };

    const clearAllSlots = () => {
        setFormData(prev => ({ ...prev, placementSlots: [] }));
    };

    const selectRecommended = () => {
        setFormData(prev => ({ ...prev, placementSlots: [...RECOMMENDED_SLOTS] }));
    };

    // ─── Filtered slots for search ──────────────────────────────────────
    const filteredGroups = useMemo(() => {
        const search = slotSearch.toLowerCase().trim();
        if (!search) return SLOT_GROUPS;
        const result: Record<string, AdSlotName[]> = {};
        for (const [group, slots] of Object.entries(SLOT_GROUPS)) {
            const filtered = slots.filter(s =>
                AD_SLOT_LABELS[s].toLowerCase().includes(search) ||
                SLOT_CONFIGS[s].description.toLowerCase().includes(search) ||
                s.toLowerCase().includes(search)
            );
            if (filtered.length > 0) result[group] = filtered;
        }
        return result;
    }, [slotSearch]);

    // ═════════════════════════════════════════════════════════════════════
    //  RENDER
    // ═════════════════════════════════════════════════════════════════════

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Enterprise Ad Manager</h1>
                    <p className="text-sm text-[#9ca3af]">Manage multi-slot campaigns, targeting, and analytics.</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="flex items-center gap-2 px-4 py-2 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white rounded-lg transition-colors font-medium text-sm shadow-lg shadow-[#8b5cf6]/20"
                >
                    <Plus className="w-4 h-4" />
                    Create Campaign
                </button>
            </div>

            {/* ═══ Campaigns Table ═══ */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {isLoading ? (
                    <div className="col-span-full flex justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-[#8b5cf6]" />
                    </div>
                ) : ads.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-[#9ca3af]">
                        No campaigns found. Create one to get started.
                    </div>
                ) : (
                    ads.map((ad) => {
                        const adSlots: string[] = ad.placementSlots && ad.placementSlots.length > 0
                            ? ad.placementSlots
                            : ad.placementSlot ? [ad.placementSlot] : [];
                        const statusCfg = STATUS_CONFIG[ad.status || (ad.isActive ? "active" : "paused")] || STATUS_CONFIG.draft;
                        const isAnalyticsExpanded = expandedAnalytics === ad._id;

                        return (
                            <div key={ad._id} className="bg-[#0f172a] border border-[#1e293b] rounded-xl overflow-hidden flex flex-col">
                                {/* Card top row */}
                                <div className="flex items-stretch">
                                    <div className="relative w-44 bg-[#020617] group flex-shrink-0">
                                        {ad.videoUrl ? (
                                            <video src={ad.videoUrl} className="w-full h-full object-cover" muted />
                                        ) : (
                                            <Image src={ad.imageUrl} alt={ad.title} fill className="object-cover" />
                                        )}
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                            <button onClick={() => openEditModal(ad)} className="p-2 bg-[#1e293b] hover:bg-[#334155] rounded-lg text-white transition-colors">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDelete(ad._id)} className="p-2 bg-red-500/20 hover:bg-red-500/40 text-red-500 rounded-lg transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div className="absolute top-2 left-2">
                                            <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded border ${statusCfg.bg} ${statusCfg.color}`}>
                                                {statusCfg.label}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="p-4 flex-1 flex flex-col justify-between min-w-0">
                                        <div>
                                            <h3 className="font-bold text-white text-lg truncate mb-1">{ad.title}</h3>
                                            <p className="text-xs text-[#9ca3af] line-clamp-1 mb-2">{ad.description || "No description"}</p>

                                            {/* Slot badges */}
                                            <div className="flex flex-wrap gap-1 mb-3">
                                                {adSlots.map(slot => (
                                                    <span key={slot} className="px-1.5 py-0.5 bg-[#8b5cf6]/10 text-[#8b5cf6] text-[9px] rounded font-bold border border-[#8b5cf6]/20">
                                                        {AD_SLOT_LABELS[slot as AdSlotName] || slot}
                                                    </span>
                                                ))}
                                                {ad.deliveryStrategy && ad.deliveryStrategy !== "single" && (
                                                    <span className="px-1.5 py-0.5 bg-[#3b82f6]/10 text-[#3b82f6] text-[9px] rounded font-bold border border-[#3b82f6]/20">
                                                        {ad.deliveryStrategy}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Global metrics */}
                                        <div className="grid grid-cols-3 gap-2 text-sm text-[#9ca3af] border-t border-[#1e293b] pt-3">
                                            <div>
                                                <p className="text-[10px] uppercase font-semibold mb-0.5">Impressions</p>
                                                <p className="text-white font-medium">{(ad.impressions || 0).toLocaleString()}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] uppercase font-semibold mb-0.5">Clicks</p>
                                                <p className="text-white font-medium">{(ad.clicks || 0).toLocaleString()}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] uppercase font-semibold mb-0.5">CTR</p>
                                                <p className="text-[#10b981] font-bold">
                                                    {ad.impressions > 0 ? ((ad.clicks / ad.impressions) * 100).toFixed(1) : "0.0"}%
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Analytics toggle */}
                                {ad.slotAnalytics && ad.slotAnalytics.length > 0 && (
                                    <div className="border-t border-[#1e293b]">
                                        <button
                                            onClick={() => setExpandedAnalytics(isAnalyticsExpanded ? null : ad._id)}
                                            className="w-full px-4 py-2 flex items-center justify-between text-xs font-bold text-[#8b5cf6] hover:bg-[#0b1220] transition-colors"
                                        >
                                            <span className="flex items-center gap-1.5">
                                                <BarChart className="w-3.5 h-3.5" />
                                                Analytics by Slot ({ad.slotAnalytics.length} slots)
                                            </span>
                                            {isAnalyticsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                        </button>
                                        {isAnalyticsExpanded && (
                                            <div className="px-4 pb-4">
                                                <SlotAnalyticsPanel slotAnalytics={ad.slotAnalytics} />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* ═══ Create/Edit Modal ═══ */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-[#1e293b] flex justify-between items-center bg-[#0b1220]">
                            <div>
                                <h2 className="text-xl font-bold text-white">
                                    {formData._id ? "Edit Campaign" : "New Campaign"}
                                </h2>
                                <p className="text-xs text-[#6b7280] mt-0.5">Configure placement, targeting, and delivery.</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="text-[#9ca3af] hover:text-white p-1 rounded-lg hover:bg-[#1e293b] transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* ══════ LEFT COLUMN ══════ */}
                                <div className="space-y-6">
                                    {/* Creative Assets */}
                                    <div>
                                        <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider border-b border-[#1e293b] pb-2">Creative Assets</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="border-2 border-dashed border-[#1e293b] rounded-xl p-4 flex flex-col items-center justify-center bg-[#020617] relative h-32">
                                                {formData.imageUrl ? (
                                                    <>
                                                        <Image src={formData.imageUrl} alt="Preview" fill className="object-contain p-2" />
                                                        <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity">
                                                            <label className="cursor-pointer px-3 py-1 bg-[#1e293b] text-white rounded text-xs font-bold">
                                                                Replace
                                                                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, false)} />
                                                            </label>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <label className="cursor-pointer flex flex-col items-center gap-2 text-[#9ca3af] hover:text-white transition-colors">
                                                        {isUploadingImage ? <Loader2 className="w-6 h-6 animate-spin" /> : <ImageIcon className="w-6 h-6" />}
                                                        <span className="text-[10px] uppercase font-bold text-center">Image (Required)</span>
                                                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, false)} required={!formData._id} />
                                                    </label>
                                                )}
                                            </div>
                                            <div className="border-2 border-dashed border-[#1e293b] rounded-xl p-4 flex flex-col items-center justify-center bg-[#020617] relative h-32">
                                                {formData.videoUrl ? (
                                                    <>
                                                        <video src={formData.videoUrl} className="w-full h-full object-cover rounded" />
                                                        <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity">
                                                            <label className="cursor-pointer px-3 py-1 bg-[#1e293b] text-white rounded text-xs font-bold">
                                                                Replace
                                                                <input type="file" className="hidden" accept="video/mp4,video/webm" onChange={(e) => handleFileUpload(e, true)} />
                                                            </label>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <label className="cursor-pointer flex flex-col items-center gap-2 text-[#9ca3af] hover:text-white transition-colors">
                                                        {isUploadingVideo ? <Loader2 className="w-6 h-6 animate-spin" /> : <VideoIcon className="w-6 h-6" />}
                                                        <span className="text-[10px] uppercase font-bold text-center">Video (Optional)</span>
                                                        <input type="file" className="hidden" accept="video/mp4,video/webm" onChange={(e) => handleFileUpload(e, true)} />
                                                    </label>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Content & Display */}
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider border-b border-[#1e293b] pb-2">Content & Display</h3>
                                        <div>
                                            <label className="block text-[10px] uppercase font-bold text-[#9ca3af] mb-1">Title</label>
                                            <input type="text" required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full bg-[#020617] border border-[#1e293b] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#8b5cf6]" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] uppercase font-bold text-[#9ca3af] mb-1">Description</label>
                                            <textarea rows={2} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full bg-[#020617] border border-[#1e293b] rounded-lg px-3 py-2 text-sm text-white outline-none resize-none focus:border-[#8b5cf6]" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] uppercase font-bold text-[#9ca3af] mb-1">Target URL</label>
                                                <input type="url" value={formData.targetUrl} onChange={(e) => setFormData({ ...formData, targetUrl: e.target.value })} className="w-full bg-[#020617] border border-[#1e293b] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#8b5cf6]" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] uppercase font-bold text-[#9ca3af] mb-1">CTA Button</label>
                                                <input type="text" value={formData.ctaText} onChange={(e) => setFormData({ ...formData, ctaText: e.target.value })} className="w-full bg-[#020617] border border-[#1e293b] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#8b5cf6]" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] uppercase font-bold text-[#9ca3af] mb-1">Design Mode</label>
                                                <select value={formData.designMode} onChange={(e) => setFormData({ ...formData, designMode: e.target.value })} className="w-full bg-[#020617] border border-[#1e293b] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#8b5cf6]">
                                                    <option value="compact">Compact</option>
                                                    <option value="standard">Standard</option>
                                                    <option value="premium">Premium</option>
                                                    <option value="minimal">Minimal</option>
                                                    <option value="glass">Glass</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] uppercase font-bold text-[#9ca3af] mb-1">Delivery Strategy</label>
                                                <select value={formData.deliveryStrategy} onChange={(e) => setFormData({ ...formData, deliveryStrategy: e.target.value })} className="w-full bg-[#020617] border border-[#1e293b] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#8b5cf6]">
                                                    <option value="single">Single (One ad per slot)</option>
                                                    <option value="rotate">Rotate (Every 30s)</option>
                                                    <option value="weighted">Weighted (By CTR)</option>
                                                    <option value="sequential">Sequential</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ═══ PLACEMENT SLOTS GRID ═══ */}
                                    <div>
                                        <div className="flex items-center justify-between mb-4 border-b border-[#1e293b] pb-2">
                                            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                                <Target className="w-4 h-4 text-[#8b5cf6]" />
                                                Placement Slots
                                                {formData.placementSlots.length > 0 && (
                                                    <span className="ml-1 px-2 py-0.5 text-[10px] font-bold bg-[#8b5cf6]/20 text-[#8b5cf6] rounded-full">
                                                        {formData.placementSlots.length} selected
                                                    </span>
                                                )}
                                            </h3>
                                        </div>

                                        {/* Search + Actions */}
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="relative flex-1">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6b7280]" />
                                                <input
                                                    type="text"
                                                    placeholder="Search slots..."
                                                    value={slotSearch}
                                                    onChange={(e) => setSlotSearch(e.target.value)}
                                                    className="w-full bg-[#020617] border border-[#1e293b] rounded-lg pl-9 pr-3 py-2 text-xs text-white outline-none focus:border-[#8b5cf6]"
                                                />
                                            </div>
                                            <button type="button" onClick={selectAllSlots} className="px-2.5 py-2 text-[10px] font-bold uppercase text-[#9ca3af] hover:text-white bg-[#020617] border border-[#1e293b] rounded-lg hover:border-[#334155] transition-colors flex items-center gap-1">
                                                <CheckCheck className="w-3 h-3" /> All
                                            </button>
                                            <button type="button" onClick={selectRecommended} className="px-2.5 py-2 text-[10px] font-bold uppercase text-[#f59e0b] hover:text-white bg-[#f59e0b]/10 border border-[#f59e0b]/20 rounded-lg hover:bg-[#f59e0b]/20 transition-colors flex items-center gap-1">
                                                <Sparkles className="w-3 h-3" /> Top
                                            </button>
                                            {formData.placementSlots.length > 0 && (
                                                <button type="button" onClick={clearAllSlots} className="px-2.5 py-2 text-[10px] font-bold uppercase text-red-400 hover:text-white bg-red-500/10 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors">
                                                    Clear
                                                </button>
                                            )}
                                        </div>

                                        {/* Conflict Warning */}
                                        {slotConflictWarning && (
                                            <div className="mb-4 p-3 bg-[#f59e0b]/10 border border-[#f59e0b]/30 rounded-lg flex items-start gap-2">
                                                <AlertTriangle className="w-4 h-4 text-[#f59e0b] flex-shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="text-xs font-bold text-[#f59e0b]">Slot Conflict Detected</p>
                                                    <p className="text-[11px] text-[#f59e0b]/80 mt-0.5">{slotConflictWarning}</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Grouped Slot Grid */}
                                        <div className="space-y-5">
                                            {Object.entries(filteredGroups).map(([group, slots]) => (
                                                <div key={group}>
                                                    <p className="text-[10px] font-bold text-[#6b7280] uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                                        <Zap className="w-3 h-3" />
                                                        {group}
                                                    </p>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        {slots.map(slot => (
                                                            <SlotCard
                                                                key={slot}
                                                                slot={slot}
                                                                isSelected={formData.placementSlots.includes(slot)}
                                                                isRecommended={RECOMMENDED_SLOTS.includes(slot)}
                                                                onToggle={() => toggleSlot(slot)}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* ══════ RIGHT COLUMN ══════ */}
                                <div className="space-y-6">
                                    {/* Targeting */}
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider border-b border-[#1e293b] pb-2">Targeting</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] uppercase font-bold text-[#9ca3af] mb-1">Target Cities</label>
                                                <input type="text" placeholder="e.g. Mumbai, Delhi" value={formData.targetCities} onChange={(e) => setFormData({ ...formData, targetCities: e.target.value })} className="w-full bg-[#020617] border border-[#1e293b] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#8b5cf6]" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] uppercase font-bold text-[#9ca3af] mb-1">Target Plans</label>
                                                <input type="text" placeholder="e.g. Premium, Pro" value={formData.targetPlans} onChange={(e) => setFormData({ ...formData, targetPlans: e.target.value })} className="w-full bg-[#020617] border border-[#1e293b] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#8b5cf6]" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] uppercase font-bold text-[#9ca3af] mb-1">Target Roles</label>
                                                <input type="text" placeholder="e.g. Admin, Manager" value={formData.targetRoles} onChange={(e) => setFormData({ ...formData, targetRoles: e.target.value })} className="w-full bg-[#020617] border border-[#1e293b] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#8b5cf6]" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] uppercase font-bold text-[#9ca3af] mb-1">Target Orgs</label>
                                                <input type="text" placeholder="e.g. org123, org456" value={formData.targetOrganizations} onChange={(e) => setFormData({ ...formData, targetOrganizations: e.target.value })} className="w-full bg-[#020617] border border-[#1e293b] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#8b5cf6]" />
                                            </div>
                                        </div>
                                        <div className="pt-2">
                                            <label className="block text-[10px] uppercase font-bold text-[#9ca3af] mb-2">Target Modules</label>
                                            <div className="flex flex-wrap gap-2">
                                                {modules.map((m) => (
                                                    <button type="button" key={m} onClick={() => toggleArrayItem(formData.targetModules, m, "targetModules")} className={`px-2 py-1 rounded text-xs font-bold transition-colors border ${formData.targetModules.includes(m) ? "bg-[#8b5cf6]/20 border-[#8b5cf6] text-[#8b5cf6]" : "bg-[#020617] border-[#1e293b] text-[#9ca3af]"}`}>{m}</button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="pt-2">
                                            <label className="block text-[10px] uppercase font-bold text-[#9ca3af] mb-2">Target Pages</label>
                                            <div className="flex flex-wrap gap-2">
                                                {pages.map((p) => (
                                                    <button type="button" key={p} onClick={() => toggleArrayItem(formData.targetPages, p, "targetPages")} className={`px-2 py-1 rounded text-xs font-bold transition-colors border ${formData.targetPages.includes(p) ? "bg-[#10b981]/20 border-[#10b981] text-[#10b981]" : "bg-[#020617] border-[#1e293b] text-[#9ca3af]"}`}>{p}</button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Rules & Schedule */}
                                    <div className="space-y-4 pt-4">
                                        <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider border-b border-[#1e293b] pb-2">Rules & Schedule</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] uppercase font-bold text-[#9ca3af] mb-1">Start Date</label>
                                                <input type="datetime-local" required value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} className="w-full bg-[#020617] border border-[#1e293b] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#8b5cf6]" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] uppercase font-bold text-[#9ca3af] mb-1">End Date</label>
                                                <input type="datetime-local" required value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} className="w-full bg-[#020617] border border-[#1e293b] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#8b5cf6]" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] uppercase font-bold text-[#9ca3af] mb-1">Max Views (0=No Limit)</label>
                                                <input type="number" min={0} value={formData.frequencyCap} onChange={(e) => setFormData({ ...formData, frequencyCap: Number(e.target.value) })} className="w-full bg-[#020617] border border-[#1e293b] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#8b5cf6]" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] uppercase font-bold text-[#9ca3af] mb-1">Priority (Higher=Top)</label>
                                                <input type="number" value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) })} className="w-full bg-[#020617] border border-[#1e293b] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#8b5cf6]" />
                                            </div>
                                        </div>

                                        {/* Campaign Status */}
                                        <div className="pt-4">
                                            <label className="block text-[10px] uppercase font-bold text-[#9ca3af] mb-2">Campaign Status</label>
                                            <div className="grid grid-cols-3 gap-2">
                                                {(["draft", "active", "paused"] as const).map(s => {
                                                    const cfg = STATUS_CONFIG[s];
                                                    return (
                                                        <button
                                                            type="button"
                                                            key={s}
                                                            onClick={() => setFormData({ ...formData, status: s })}
                                                            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all border ${
                                                                formData.status === s
                                                                    ? `${cfg.bg} ${cfg.color} ring-1 ring-current`
                                                                    : "bg-[#020617] border-[#1e293b] text-[#9ca3af] hover:border-[#334155]"
                                                            }`}
                                                        >
                                                            {cfg.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Submit bar */}
                            <div className="pt-6 mt-6 border-t border-[#1e293b] flex justify-end gap-3 sticky bottom-0 bg-[#0f172a] py-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-[#9ca3af] hover:text-white transition-colors">
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving || !formData.imageUrl || formData.targetModules.length === 0 || formData.placementSlots.length === 0 || !!slotConflictWarning}
                                    className="px-6 py-2.5 text-sm font-bold bg-[#8b5cf6] hover:bg-[#7c3aed] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-[#8b5cf6]/20"
                                >
                                    {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                                    {isSaving ? "Saving..." : "Launch Campaign"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
