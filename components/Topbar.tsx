"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Droplets, Menu, X, Bell, Search, Settings as SettingsIcon } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { usePathname } from "next/navigation";

const PAGE_TITLES: Record<string, string> = {
    "/dashboard":        "Intelligence Dashboard",
    "/entry":            "QR Entry Scanner",
    "/members":          "Member Relationships",
    "/expired-members":  "Expired Members",
    "/plans":            "Subscription Plans",
    "/payments":         "Financial Ledger",
    "/balance-payments": "Balance Payments",
    "/staff":            "Staff Management",
    "/competitions":     "Competitions",
    "/notifications":    "Notifications",
    "/revenue-analytics": "Revenue Analytics",
    "/twilio":           "WhatsApp Integration",
    "/settings":         "System Settings",
};

export function Topbar() {
    const { data: session } = useSession();
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);

    const suffix = Object.keys(PAGE_TITLES).find((k) => pathname?.endsWith(k)) ?? "";
    const title  = PAGE_TITLES[suffix] ?? "Pool Admin";

    return (
        <>
            {/* Mobile overlay sidebar */}
            {mobileOpen && (
                <div className="fixed inset-0 z-40 flex md:hidden">
                    <div className="relative flex w-52 flex-col shadow-2xl">
                        <Sidebar />
                    </div>
                    <div
                        className="flex-1 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                        onClick={() => setMobileOpen(false)}
                    />
                </div>
            )}

            <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#1f2937] bg-[#020617] px-4 sm:px-8 gap-5">
                {/* Left: Mobile Toggle + Breadcrumb/Title */}
                <div className="flex items-center gap-4 min-w-0">
                    <button
                        className="md:hidden rounded-xl p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-[#9ca3af] hover:text-[#f9fafb] hover:bg-[#111827] transition-all"
                        onClick={() => setMobileOpen(!mobileOpen)}
                        aria-label="Toggle menu"
                    >
                        {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                    </button>
                    
                    <div className="hidden sm:flex items-center gap-2 text-[#8b5cf6]">
                        <Droplets className="h-5 w-5" />
                        <span className="text-xs font-bold uppercase tracking-widest opacity-50">Portal</span>
                        <span className="text-[#1f2937]">/</span>
                    </div>
                    
                    <h1 className="text-base font-bold text-[#f9fafb] truncate tracking-tight">{title}</h1>
                </div>

                {/* Center: Search */}
                {!pathname?.endsWith("/expired-members") && (
                    <div className="hidden lg:flex flex-1 max-w-lg relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-[#6b7280]" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search members, payments, plans..."
                            className="block w-full pl-12 pr-4 py-3 border border-[#1f2937] rounded-xl bg-[#0b1220] text-base text-[#f9fafb] placeholder:text-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all"
                        />
                    </div>
                )}

                {/* Right: Actions + User */}
                <div className="flex items-center gap-4">
                    <button className="p-2 text-[#9ca3af] hover:text-[#8b5cf6] hover:bg-[#8b5cf6]/10 rounded-xl transition-all relative">
                        <Bell className="h-6 w-6" />
                        <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-[#8b5cf6] rounded-full border-2 border-[#020617]"></span>
                    </button>
                    
                    <button className="hidden sm:flex p-2 text-[#9ca3af] hover:text-[#f9fafb] hover:bg-[#111827] rounded-xl transition-all">
                        <SettingsIcon className="h-6 w-6" />
                    </button>
                    
                    <div className="h-10 w-px bg-[#1f2937] mx-1 hidden sm:block" />

                    <div className="flex items-center gap-3 pl-1">
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-bold text-[#f9fafb] leading-none mb-1">
                                {session?.user?.role === "admin" || session?.user?.role === "superadmin"
                                    ? `${session?.user?.poolName || "Pool"} (Admin)`
                                    : `${session?.user?.name || "User"} (${session?.user?.role})`}
                            </p>
                            <p className="text-xs font-medium text-[#9ca3af] uppercase tracking-wide">
                                {session?.user?.role?.replace('_', ' ')}
                            </p>
                        </div>
                        <div className="h-11 w-11 rounded-xl bg-[#0b1220] flex items-center justify-center border border-[#1f2937]">
                            <span className="text-sm font-bold text-[#8b5cf6] uppercase">
                                {session?.user?.name?.[0] ?? "A"}
                            </span>
                        </div>
                    </div>
                </div>
            </header>
        </>
    );
}
