"use client";

import { Settings, User, Building2, Shield, BellOff, Palette, Save } from "lucide-react";

export default function BusinessSettingsPage() {
    return (
        <div className="space-y-8 max-w-4xl">
            <div>
                <h1 className="text-2xl font-bold text-[#f9fafb] flex items-center gap-2">
                    <Settings className="h-6 w-6 text-[#8b5cf6]" />
                    Business Settings
                </h1>
                <p className="text-sm text-[#6b7280]">Manage your enterprise configuration and profile</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Sidebar Tabs (Visual) */}
                <div className="space-y-1">
                    {[
                        { name: "General", icon: Building2, active: true },
                        { name: "Security", icon: Shield, active: false },
                        { name: "Appearance", icon: Palette, active: false },
                        { name: "Notifications", icon: BellOff, active: false },
                    ].map((tab) => (
                        <button
                            key={tab.name}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                                tab.active 
                                    ? "bg-[#8b5cf6]/10 text-[#8b5cf6] border border-[#8b5cf6]/20" 
                                    : "text-[#9ca3af] hover:bg-[#111827] hover:text-[#f9fafb]"
                            }`}
                        >
                            <tab.icon className="h-4 w-4" />
                            {tab.name}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="md:col-span-2 space-y-6">
                    <div className="rounded-2xl bg-[#0b1220] border border-[#1f2937] p-6 space-y-6">
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-[#f9fafb] uppercase tracking-wider">Enterprise Profile</h3>
                            
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-[#9ca3af] mb-1.5 uppercase">Business Name</label>
                                    <input 
                                        type="text" 
                                        placeholder="Enter business name"
                                        className="w-full rounded-xl border border-[#1f2937] bg-[#020617] px-4 py-2.5 text-sm text-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[#9ca3af] mb-1.5 uppercase">Contact Email</label>
                                    <input 
                                        type="email" 
                                        placeholder="admin@enterprise.com"
                                        className="w-full rounded-xl border border-[#1f2937] bg-[#020617] px-4 py-2.5 text-sm text-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-[#1f2937] flex justify-end">
                            <button className="flex items-center gap-2 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-[#8b5cf6]/20">
                                <Save className="h-4 w-4" />
                                Save Changes
                            </button>
                        </div>
                    </div>

                    {/* Info Card */}
                    <div className="rounded-2xl bg-rose-500/5 border border-rose-500/10 p-4">
                        <div className="flex gap-3">
                            <Shield className="h-5 w-5 text-rose-400 shrink-0" />
                            <div>
                                <p className="text-sm font-bold text-rose-400">Restricted Area</p>
                                <p className="text-xs text-rose-400/80 mt-1">Some settings are locked by the platform administrator to ensure system stability.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
