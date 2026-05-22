"use client";

import { useState, useEffect } from "react";
import { Plus, Image as ImageIcon, Trash2, Edit2, Loader2, X } from "lucide-react";
import Image from "next/image";

export default function AdsPage() {
    const [ads, setAds] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [formData, setFormData] = useState({
        _id: "",
        title: "",
        description: "",
        imageUrl: "",
        targetUrl: "",
        type: "popup",
        isActive: true,
        startDate: "",
        endDate: "",
        targetModules: [] as string[],
        targetPages: [] as string[],
        displayIntervalMinutes: 30,
        priority: 0,
    });

    const modules = ["pool", "hostel", "business"];
    const pages = ["dashboard", "members", "staff", "entry", "overview", "customers", "labour", "payments"];

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

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64String = reader.result as string;
            try {
                const res = await fetch("/api/superadmin/upload", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ file: base64String }),
                });
                const data = await res.json();
                if (data.url) {
                    setFormData({ ...formData, imageUrl: data.url });
                }
            } catch (error) {
                console.error("Upload failed", error);
            }
            setIsUploading(false);
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const url = formData._id ? `/api/superadmin/ads/${formData._id}` : "/api/superadmin/ads";
            const method = formData._id ? "PUT" : "POST";

            const payload = { ...formData };
            if (!payload._id) delete (payload as any)._id;

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                setIsModalOpen(false);
                fetchAds();
            }
        } catch (error) {
            console.error(error);
        }
        setIsSaving(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this ad?")) return;
        try {
            await fetch(`/api/superadmin/ads/${id}`, { method: "DELETE" });
            fetchAds();
        } catch (error) {
            console.error(error);
        }
    };

    const openCreateModal = () => {
        setFormData({
            _id: "",
            title: "",
            description: "",
            imageUrl: "",
            targetUrl: "",
            type: "popup",
            isActive: true,
            startDate: new Date().toISOString().slice(0, 16),
            endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
            targetModules: ["pool", "hostel", "business"],
            targetPages: ["dashboard"],
            displayIntervalMinutes: 30,
            priority: 0,
        });
        setIsModalOpen(true);
    };

    const openEditModal = (ad: any) => {
        setFormData({
            ...ad,
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
                    <h1 className="text-2xl font-bold text-white tracking-tight">Manage Ads</h1>
                    <p className="text-sm text-[#9ca3af]">Create and control ads across all modules.</p>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                        <div key={ad._id} className="bg-[#0f172a] border border-[#1e293b] rounded-xl overflow-hidden flex flex-col">
                            <div className="relative h-40 bg-[#020617] group">
                                <Image src={ad.imageUrl} alt={ad.title} fill className="object-cover" />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                    <button onClick={() => openEditModal(ad)} className="p-2 bg-[#1e293b] hover:bg-[#334155] rounded-lg text-white transition-colors">
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDelete(ad._id)} className="p-2 bg-red-500/20 hover:bg-red-500/40 text-red-500 rounded-lg transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                {!ad.isActive && (
                                    <div className="absolute top-2 right-2 px-2 py-1 bg-red-500/80 backdrop-blur-sm text-white text-xs font-bold rounded-md">
                                        Inactive
                                    </div>
                                )}
                            </div>
                            <div className="p-4 flex-1 flex flex-col">
                                <h3 className="font-bold text-white text-lg truncate">{ad.title}</h3>
                                <div className="flex gap-2 mt-2">
                                    <span className="px-2 py-1 bg-[#1e293b] text-[#9ca3af] text-[10px] rounded uppercase font-semibold">
                                        {ad.type}
                                    </span>
                                    <span className="px-2 py-1 bg-[#8b5cf6]/20 text-[#8b5cf6] text-[10px] rounded uppercase font-semibold">
                                        Priority: {ad.priority}
                                    </span>
                                </div>
                                <div className="mt-4 grid grid-cols-2 gap-4 text-sm text-[#9ca3af] border-t border-[#1e293b] pt-4">
                                    <div>
                                        <p className="text-[10px] uppercase font-semibold mb-1">Impressions</p>
                                        <p className="text-white font-medium">{ad.impressions || 0}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase font-semibold mb-1">Clicks</p>
                                        <p className="text-white font-medium">{ad.clicks || 0}</p>
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
                    <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
                        <div className="p-6 border-b border-[#1e293b] flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white">
                                {formData._id ? "Edit Ad" : "Create New Ad"}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-[#9ca3af] hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-6 custom-scrollbar">
                            {/* Image Upload */}
                            <div>
                                <label className="block text-sm font-medium text-[#9ca3af] mb-2">Ad Banner Image</label>
                                <div className="border-2 border-dashed border-[#1e293b] rounded-xl p-4 flex flex-col items-center justify-center bg-[#020617] relative h-40">
                                    {formData.imageUrl ? (
                                        <>
                                            <Image src={formData.imageUrl} alt="Preview" fill className="object-contain p-2" />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <label className="cursor-pointer px-4 py-2 bg-[#1e293b] text-white rounded-lg text-sm font-medium">
                                                    Change Image
                                                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                                </label>
                                            </div>
                                        </>
                                    ) : (
                                        <label className="cursor-pointer flex flex-col items-center gap-2 text-[#9ca3af] hover:text-white transition-colors">
                                            {isUploading ? <Loader2 className="w-8 h-8 animate-spin text-[#8b5cf6]" /> : <ImageIcon className="w-8 h-8" />}
                                            <span className="text-sm font-medium">{isUploading ? "Uploading..." : "Click to upload image"}</span>
                                            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} required={!formData._id} />
                                        </label>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-[#9ca3af] mb-2">Title</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full bg-[#020617] border border-[#1e293b] rounded-lg px-4 py-2.5 text-white focus:border-[#8b5cf6] focus:ring-1 focus:ring-[#8b5cf6] outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#9ca3af] mb-2">Target URL (Optional)</label>
                                    <input
                                        type="url"
                                        value={formData.targetUrl}
                                        onChange={(e) => setFormData({ ...formData, targetUrl: e.target.value })}
                                        className="w-full bg-[#020617] border border-[#1e293b] rounded-lg px-4 py-2.5 text-white focus:border-[#8b5cf6] focus:ring-1 focus:ring-[#8b5cf6] outline-none"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-[#9ca3af] mb-2">Description</label>
                                    <textarea
                                        rows={2}
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full bg-[#020617] border border-[#1e293b] rounded-lg px-4 py-2.5 text-white focus:border-[#8b5cf6] focus:ring-1 focus:ring-[#8b5cf6] outline-none resize-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-[#9ca3af] mb-2">Ad Type</label>
                                    <select
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                        className="w-full bg-[#020617] border border-[#1e293b] rounded-lg px-4 py-2.5 text-white focus:border-[#8b5cf6] focus:ring-1 focus:ring-[#8b5cf6] outline-none"
                                    >
                                        <option value="corner">Corner Widget</option>
                                        <option value="popup">Timed Popup</option>
                                        <option value="both">Both</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#9ca3af] mb-2">Popup Cooldown (Mins)</label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={formData.displayIntervalMinutes}
                                        onChange={(e) => setFormData({ ...formData, displayIntervalMinutes: Number(e.target.value) })}
                                        className="w-full bg-[#020617] border border-[#1e293b] rounded-lg px-4 py-2.5 text-white focus:border-[#8b5cf6] focus:ring-1 focus:ring-[#8b5cf6] outline-none"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-[#9ca3af] mb-2">Start Date</label>
                                    <input
                                        type="datetime-local"
                                        required
                                        value={formData.startDate}
                                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                        className="w-full bg-[#020617] border border-[#1e293b] rounded-lg px-4 py-2.5 text-white focus:border-[#8b5cf6] focus:ring-1 focus:ring-[#8b5cf6] outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#9ca3af] mb-2">End Date</label>
                                    <input
                                        type="datetime-local"
                                        required
                                        value={formData.endDate}
                                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                        className="w-full bg-[#020617] border border-[#1e293b] rounded-lg px-4 py-2.5 text-white focus:border-[#8b5cf6] focus:ring-1 focus:ring-[#8b5cf6] outline-none"
                                    />
                                </div>

                                <div className="md:col-span-2 space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-[#9ca3af] mb-2">Target Modules</label>
                                        <div className="flex flex-wrap gap-2">
                                            {modules.map((m) => (
                                                <button
                                                    key={m}
                                                    type="button"
                                                    onClick={() => toggleArrayItem(formData.targetModules, m, "targetModules")}
                                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                                                        formData.targetModules.includes(m)
                                                            ? "bg-[#8b5cf6]/20 border-[#8b5cf6] text-[#8b5cf6]"
                                                            : "bg-[#020617] border-[#1e293b] text-[#9ca3af] hover:border-[#334155]"
                                                    }`}
                                                >
                                                    {m.charAt(0).toUpperCase() + m.slice(1)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-[#9ca3af] mb-2">Target Pages</label>
                                        <div className="flex flex-wrap gap-2">
                                            {pages.map((p) => (
                                                <button
                                                    key={p}
                                                    type="button"
                                                    onClick={() => toggleArrayItem(formData.targetPages, p, "targetPages")}
                                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                                                        formData.targetPages.includes(p)
                                                            ? "bg-[#10b981]/20 border-[#10b981] text-[#10b981]"
                                                            : "bg-[#020617] border-[#1e293b] text-[#9ca3af] hover:border-[#334155]"
                                                    }`}
                                                >
                                                    {p.charAt(0).toUpperCase() + p.slice(1)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="flex-1">
                                        <label className="block text-sm font-medium text-[#9ca3af] mb-2">Priority (Higher = First)</label>
                                        <input
                                            type="number"
                                            value={formData.priority}
                                            onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) })}
                                            className="w-full bg-[#020617] border border-[#1e293b] rounded-lg px-4 py-2.5 text-white focus:border-[#8b5cf6] focus:ring-1 focus:ring-[#8b5cf6] outline-none"
                                        />
                                    </div>
                                    <div className="flex-1 pt-6">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={formData.isActive}
                                                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                                className="w-5 h-5 rounded border-[#1e293b] bg-[#020617] text-[#8b5cf6] focus:ring-[#8b5cf6] focus:ring-offset-[#0f172a]"
                                            />
                                            <span className="text-sm font-medium text-white">Active</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-[#1e293b] flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-5 py-2.5 text-sm font-medium text-[#9ca3af] hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving || !formData.imageUrl || formData.targetModules.length === 0 || formData.targetPages.length === 0}
                                    className="px-5 py-2.5 text-sm font-medium bg-[#8b5cf6] hover:bg-[#7c3aed] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
                                >
                                    {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                                    {isSaving ? "Saving..." : "Save Ad"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
