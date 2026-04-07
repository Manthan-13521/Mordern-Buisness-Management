"use client";

import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Building2, Menu, X, Layers } from "lucide-react";
import { useState } from "react";
import { HostelSidebar } from "./HostelSidebar";

const PAGE_TITLES: Record<string, string> = {
    "/dashboard":        "Dashboard",
    "/members":          "Members",
    "/expired-members":  "Expired Members",
    "/balance-payments": "Balance & Payments",
    "/plans":            "Plans",
    "/payments":         "Payments",
    "/staff":            "Staff",
    "/logs":             "Activity Logs",
    "/whatsapp":         "WhatsApp",
    "/hostel-settings":  "Hostel Settings",
    "/settings":         "Settings",
};

// Pages where the block filter should NOT appear
const NO_FILTER_PAGES = ["/hostel-settings", "/settings", "/whatsapp", "/plans"];

export function HostelTopbar() {
    const pathname = usePathname();
    const { data: session } = useSession();
    const [mobileOpen, setMobileOpen] = useState(false);

    const suffix = Object.keys(PAGE_TITLES).find((k) => pathname.endsWith(k)) ?? "";
    const title  = PAGE_TITLES[suffix] ?? "Hostel Admin";

    return (
        <>
            {/* Mobile overlay sidebar */}
            {mobileOpen && (
                <div className="fixed inset-0 z-40 flex md:hidden">
                    <div className="relative flex w-64 flex-col">
                        <HostelSidebar />
                    </div>
                    <div
                        className="flex-1 bg-black/60 backdrop-blur-sm"
                        onClick={() => setMobileOpen(false)}
                    />
                </div>
            )}

            <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur px-4 shadow-sm gap-3">
                {/* Left: hamburger + title */}
                <div className="flex items-center gap-3 min-w-0">
                    <button
                        className="md:hidden rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 flex-shrink-0"
                        onClick={() => setMobileOpen(!mobileOpen)}
                        aria-label="Toggle menu"
                    >
                        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </button>
                    <div className="flex items-center gap-2 min-w-0">
                        <Building2 className="h-4 w-4 text-blue-500 flex-shrink-0" />
                        <h1 className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{title}</h1>
                    </div>
                </div>

                {/* Centre / Right: User */}
                <div className="flex items-center gap-3 flex-shrink-0">
                    {/* User avatar */}
                    <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 border-0 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {session?.user?.name?.[0]?.toUpperCase() ?? "H"}
                        </div>
                        <span className="hidden sm:block text-xs text-slate-500 dark:text-slate-400">
                            {session?.user?.name || "Admin"}
                        </span>
                    </div>
                </div>
            </header>
        </>
    );
}
