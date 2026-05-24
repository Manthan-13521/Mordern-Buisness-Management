"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
    LayoutDashboard,
    Droplets,
    Building2,
    Briefcase,
    MessageSquare,
    CreditCard,
    Gift,
    LogOut,
    Shield,
    Megaphone,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export function SuperAdminSidebar() {
    const pathname = usePathname();

    const links = [
        { name: "Dashboard",    href: "/superadmin",            icon: LayoutDashboard },
        { name: "Manage Ads",   href: "/superadmin/ads",        icon: Megaphone },
        { name: "Manage Pools", href: "/superadmin/pools",      icon: Droplets },
        { name: "Manage Hostels", href: "/superadmin/hostels",  icon: Building2 },
        { name: "Manage Businesses", href: "/superadmin/businesses", icon: Briefcase },
        { name: "Feedback",     href: "/superadmin/feedback",   icon: MessageSquare },
        { name: "Billing",      href: "/superadmin/billing",    icon: CreditCard },
        { name: "Referrals",    href: "/superadmin/referrals",  icon: Gift },
        { name: "Pending Registrations", href: "/superadmin/pending-registrations", icon: LayoutDashboard },
    ];

    return (
        <div className="flex h-full w-64 flex-col bg-[var(--sa-bg)] text-[var(--sa-text-primary)] border-r border-[var(--sa-border)] transition-colors duration-300">
            {/* Logo area */}
            <div className="flex h-16 items-center px-6 gap-3 border-b border-[var(--sa-border)] shrink-0">
                <div className="w-8 h-8 rounded-xl bg-[var(--sa-bg-elevated)] flex items-center justify-center border border-[var(--sa-border)]">
                    <Shield className="w-4 h-4 text-[var(--sa-accent)]" />
                </div>
                <div className="overflow-hidden">
                    <h1 className="text-base font-bold truncate text-[var(--sa-text-primary)]">AquaSync</h1>
                    <p className="text-[10px] text-[var(--sa-text-muted)] font-semibold tracking-wide uppercase">Platform Control</p>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto custom-scrollbar">
                {links.map((item) => {
                    const isActive = item.href === "/superadmin"
                        ? pathname === "/superadmin"
                        : pathname.startsWith(item.href);
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={clsx(
                                "group flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 font-medium",
                                isActive
                                    ? "bg-[var(--sa-accent-muted)] text-[var(--sa-accent)]"
                                    : "text-[var(--sa-text-secondary)] hover:text-[var(--sa-text-primary)] hover:bg-[var(--sa-bg-card-hover)]"
                            )}
                        >
                            <item.icon
                                className={clsx(
                                    "w-4 h-4 transition-colors duration-200",
                                    isActive ? "text-[var(--sa-accent)]" : "text-[var(--sa-text-muted)] group-hover:text-[var(--sa-text-primary)]"
                                )}
                            />
                            <span className="text-sm tracking-tight">{item.name}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom Section */}
            <div className="p-4 border-t border-[var(--sa-border)] bg-[var(--sa-bg)] shrink-0">
                <div className="mb-2">
                    <ThemeToggle />
                </div>
                <div className="flex items-center gap-3 px-2 py-2 mb-2 bg-[var(--sa-bg-card)] rounded-xl border border-[var(--sa-border)]">
                    <div className="w-8 h-8 rounded-lg bg-[var(--sa-bg-elevated)] flex items-center justify-center border border-[var(--sa-border)]">
                        <span className="text-xs font-bold text-[var(--sa-text-primary)]">S</span>
                    </div>
                    <div className="overflow-hidden flex-1">
                        <p className="text-sm font-bold truncate text-[var(--sa-text-primary)] leading-tight">Super Admin</p>
                        <p className="text-[10px] text-[var(--sa-text-muted)] truncate font-medium">Platform Owner</p>
                    </div>
                </div>
                <button
                    onClick={() => { window.location.href = "/superadmin/login"; }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-[var(--sa-text-muted)] hover:text-[var(--sa-danger)] hover:bg-[var(--sa-danger-muted)] rounded-lg transition-all"
                >
                    <LogOut className="w-4 h-4" />
                    <span>Log Out</span>
                </button>
            </div>
        </div>
    );
}
