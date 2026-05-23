"use client";

import { useState, useEffect } from "react";
import { Plus, Image as ImageIcon, Video as VideoIcon, Trash2, Edit2, Loader2, X } from "lucide-react";
import Image from "next/image";
import toast from "react-hot-toast";
import { AD_SLOT_LABELS, AD_SLOT_LIST } from "@/lib/ad-slots";

export default function AdsPage() {
    const [ads, setAds] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [isUploadingVideo, setIsUploadingVideo] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [formData, setFormData] = useState({
        _id: "",
        title: "",
        description: "",
        imageUrl: "",
        videoUrl: "",
        targetUrl: "",
        ctaText: "Learn More",
        type: "native",
        placementSlot: "dashboard-inline",
        designMode: "standard",
        isActive: true,
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

    useEffect(() => {
        fetchAds();
    }, []);

    const fetchAds = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/superadmin/ads");
            if (res.ok) {
                const data = await res.json();
                setAds(data);
            }
        } catch (error) {
            console.error(error);
        }
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
        const toastId = toast.loading(`Uploading ${isVideo ? 'video' : 'image'}...`);

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64String = reader.result as string;
            try {
                const res = await fetch("/api/superadmin/upload", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ file: base64String }),
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data.url) {
                        setFormData(prev => ({ ...prev, [isVideo ? 'videoUrl' : 'imageUrl']: data.url }));
                        toast.success("Upload successful!", { id: toastId });
                    }
                } else {
                    const data = await res.json();
                    toast.error(data.error || "Upload failed.", { id: toastId });
                }
            } catch (error: any) {
                toast.error("Upload failed.", { id: toastId });
            } finally {
                setter(false);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.imageUrl) {
            toast.error("Please upload a fallback image.");
            return;
        }

        setIsSaving(true);
        const toastId = toast.loading(formData._id ? "Updating ad..." : "Creating ad...");

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
                toast.success(formData._id ? "Ad updated successfully!" : "Ad created successfully!", { id: toastId });
                setIsModalOpen(false);
                fetchAds();
            } else {
                const data = await res.json();
                toast.error(data.error || "Failed to save ad.", { id: toastId });
            }
        } catch (error: any) {
            toast.error("Failed to save ad.", { id: toastId });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this ad?")) return;
        
        const toastId = toast.loading("Deleting ad...");
        try {
            const res = await fetch(`/api/superadmin/ads/${id}`, { method: "DELETE" });
            if (res.ok) {
                toast.success("Ad deleted successfully!", { id: toastId });
                fetchAds();
            } else {
                toast.error("Failed to delete ad.", { id: toastId });
            }
        } catch (error: any) {
            toast.error("Failed to delete ad.", { id: toastId });
        }
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
            placementSlot: "dashboard-inline",
            designMode: "standard",
            isActive: true,
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
        setIsModalOpen(true);
    };

    const openEditModal = (ad: any) => {
        setFormData({
            ...ad,
            targetOrganizations: ad.targetOrganizations?.join(", ") || "",
            targetPlans: ad.targetPlans?.join(", ") || "",
            targetCities: ad.targetCities?.join(", ") || "",
            targetRoles: ad.targetRoles?.join(", ") || "",
            startDate: new Date(ad.startDate).toISOString().slice(0, 16),
            endDate: new Date(ad.endDate).toISOString().slice(0, 16),
        });
        setIsModalOpen(true);
    };

    const toggleArrayItem = (array: string[], item: string, key: "targetModules" | "targetPages") => {
        if (array.includes(item)) {
            setFormData({ ...formData, [key]: array.filter((i) => i !== item) });
        } else {
            setFormData({ ...formData, [key]: [...array, item] });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Enterprise Ad Manager</h1>
                    <p className="text-sm text-[#9ca3af]">Manage native fixed slots, popups, and targeting.</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="flex items-center gap-2 px-4 py-2 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white rounded-lg transition-colors font-medium text-sm"
                >
                    <Plus className="w-4 h-4" />
                    Create Ad
                </button>
            </div>

            {/* Ads List */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {isLoading ? (
                    <div className="col-span-full flex justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-[#8b5cf6]" />
                    </div>
                ) : ads.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-[#9ca3af]">
                        No ads found. Create one to get started.
                    </div>
                ) : (
                    ads.map((ad) => (
                        <div key={ad._id} className="bg-[#0f172a] border border-[#1e293b] rounded-xl overflow-hidden flex items-stretch">
                            <div className="relative w-48 bg-[#020617] group flex-shrink-0">
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
                                {!ad.isActive && (
                                    <div className="absolute top-2 left-2 px-2 py-1 bg-red-500/80 backdrop-blur-sm text-white text-[10px] font-bold rounded-md uppercase">
                                        Inactive
                                    </div>
                                )}
                            </div>
                            <div className="p-4 flex-1 flex flex-col justify-between min-w-0">
                                <div>
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className="font-bold text-white text-lg truncate pr-2">{ad.title}</h3>
                                        <span className="px-2 py-1 bg-[#8b5cf6]/20 text-[#8b5cf6] text-[10px] rounded uppercase font-bold flex-shrink-0">
                                            {AD_SLOT_LABELS[ad.placementSlot as keyof typeof AD_SLOT_LABELS] || ad.placementSlot}
                                        </span>
                                    </div>
                                    <p className="text-xs text-[#9ca3af] line-clamp-1 mb-3">{ad.description || "No description"}</p>
                                </div>
                                
                                <div className="grid grid-cols-3 gap-2 text-sm text-[#9ca3af] border-t border-[#1e293b] pt-3">
                                    <div>
                                        <p className="text-[10px] uppercase font-semibold mb-0.5">Views</p>
                                        <p className="text-white font-medium">{ad.impressions || 0}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase font-semibold mb-0.5">Clicks</p>
                                        <p className="text-white font-medium">{ad.clicks || 0}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase font-semibold mb-0.5">CTR</p>
                                        <p className="text-[#10b981] font-bold">
                                            {ad.impressions > 0 ? ((ad.clicks / ad.impressions) * 100).toFixed(1) : 0}%
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
                        <div className="p-6 border-b border-[#1e293b] flex justify-between items-center bg-[#0b1220]">
                            <h2 className="text-xl font-bold text-white">
                                {formData._id ? "Edit Campaign" : "New Campaign"}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-[#9ca3af] hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                
                                {/* LEFT COLUMN: Creative & Core */}
                                <div className="space-y-6">
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
                                                <label className="block text-[10px] uppercase font-bold text-[#9ca3af] mb-1">CTA Button Text</label>
                                                <input type="text" value={formData.ctaText} onChange={(e) => setFormData({ ...formData, ctaText: e.target.value })} className="w-full bg-[#020617] border border-[#1e293b] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#8b5cf6]" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] uppercase font-bold text-[#9ca3af] mb-1">Placement Slot</label>
                                                <select value={formData.placementSlot} onChange={(e) => setFormData({ ...formData, placementSlot: e.target.value })} className="w-full bg-[#020617] border border-[#1e293b] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#8b5cf6]">
                                                    {AD_SLOT_LIST.map(slot => (
                                                        <option key={slot} value={slot}>{AD_SLOT_LABELS[slot]}</option>
                                                    ))}
                                                </select>
                                            </div>
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
                                        </div>
                                    </div>
                                </div>

                                {/* RIGHT COLUMN: Targeting & Rules */}
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider border-b border-[#1e293b] pb-2">Targeting (Comma Separated)</h3>
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
                                                <label className="block text-[10px] uppercase font-bold text-[#9ca3af] mb-1">Target Orgs (IDs)</label>
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
                                                <label className="block text-[10px] uppercase font-bold text-[#9ca3af] mb-1">Max Views Per User (0=No Limit)</label>
                                                <input type="number" min={0} value={formData.frequencyCap} onChange={(e) => setFormData({ ...formData, frequencyCap: Number(e.target.value) })} className="w-full bg-[#020617] border border-[#1e293b] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#8b5cf6]" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] uppercase font-bold text-[#9ca3af] mb-1">Priority (Higher=Overrides)</label>
                                                <input type="number" value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) })} className="w-full bg-[#020617] border border-[#1e293b] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#8b5cf6]" />
                                            </div>
                                        </div>
                                        <div className="pt-4 flex items-center justify-between bg-[#0b1220] p-4 rounded-xl border border-[#1e293b]">
                                            <div>
                                                <p className="text-sm font-bold text-white">Campaign Status</p>
                                                <p className="text-[10px] text-[#9ca3af]">Toggle to pause or activate</p>
                                            </div>
                                            <label className="flex items-center gap-2 cursor-pointer relative">
                                                <input type="checkbox" checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} className="sr-only peer" />
                                                <div className="w-11 h-6 bg-[#1e293b] rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-[#8b5cf6] after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 mt-6 border-t border-[#1e293b] flex justify-end gap-3 sticky bottom-0 bg-[#0f172a] py-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-[#9ca3af] hover:text-white transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" disabled={isSaving || !formData.imageUrl || formData.targetModules.length === 0} className="px-6 py-2.5 text-sm font-bold bg-[#8b5cf6] hover:bg-[#7c3aed] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-[#8b5cf6]/20">
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
