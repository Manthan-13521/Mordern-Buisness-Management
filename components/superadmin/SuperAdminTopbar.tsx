"use client";

import { usePathname } from "next/navigation";
import { Shield, Menu, X } from "lucide-react";
import { useState } from "react";
import { SuperAdminSidebar } from "./SuperAdminSidebar";

const PAGE_TITLES: Record<string, string> = {
    "/superadmin":           "SaaS Command Center",
    "/superadmin/pools":     "Pool Management",
    "/superadmin/hostels":   "Hostel Management",
    "/superadmin/businesses": "Business Management",
    "/superadmin/feedback":  "Reports & Feedback",
    "/superadmin/billing":   "Billing & Invoices",
    "/superadmin/referrals": "Growth & Referrals",
};

export function SuperAdminTopbar() {
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);

    const title = PAGE_TITLES[pathname] ?? "Platform Control";

    return (
        <>
            {/* Mobile overlay sidebar */}
            {mobileOpen && (
                <div className="fixed inset-0 z-40 flex md:hidden">
                    <div className="relative flex w-64 flex-col shadow-2xl bg-[var(--sa-bg)] h-full">
                        <SuperAdminSidebar />
                    </div>
                    <div
                        className="flex-1 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                        onClick={() => setMobileOpen(false)}
                    />
                </div>
            )}

            <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[var(--sa-border)] bg-[var(--sa-bg)] px-4 sm:px-8 gap-5 transition-colors duration-300">
                {/* Left: Mobile Toggle + Breadcrumb/Title */}
                <div className="flex items-center gap-4 min-w-0">
                    <button
                        className="md:hidden rounded-xl p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-[var(--sa-text-muted)] hover:text-[var(--sa-text-primary)] hover:bg-[var(--sa-bg-card-hover)] transition-all"
                        onClick={() => setMobileOpen(!mobileOpen)}
                        aria-label="Toggle menu"
                    >
                        {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                    </button>
                    
                    <div className="hidden sm:flex items-center gap-2 text-[var(--sa-accent)]">
                        <Shield className="h-5 w-5" />
                        <span className="text-xs font-bold uppercase tracking-widest opacity-60">Admin</span>
                        <span className="text-[var(--sa-border-active)]">/</span>
                    </div>
                    
                    <h1 className="text-base font-bold text-[var(--sa-text-primary)] truncate tracking-tight">{title}</h1>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-4">
                    <div className="h-8 w-px bg-[var(--sa-border)] mx-1 hidden sm:block" />

                    <div className="flex items-center gap-3 pl-1">
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-bold text-[var(--sa-text-primary)] leading-none mb-1">Super Admin</p>
                            <p className="text-[10px] font-medium text-[var(--sa-text-muted)] uppercase tracking-wide">Platform Owner</p>
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-[var(--sa-bg-card)] flex items-center justify-center border border-[var(--sa-border)] shadow-sm">
                            <span className="text-sm font-bold text-[var(--sa-accent)] uppercase">S</span>
                        </div>
                    </div>
                </div>
            </header>
        </>
    );
}
