"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { useEffect, useState } from "react";
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
    Calendar,
} from "lucide-react";

export function SuperAdminSidebar() {
    const pathname = usePathname();
    const [newLeadCount, setNewLeadCount] = useState(0);

    // Lightweight poll for new lead count (every 60s)
    useEffect(() => {
        const fetchCount = async () => {
            try {
                const res = await fetch("/api/superadmin/demo?status=new");
                if (res.ok) {
                    const data = await res.json();
                    setNewLeadCount(Array.isArray(data) ? data.length : 0);
                }
            } catch {
                // Silently fail — badge is non-critical
            }
        };
        fetchCount();
        const interval = setInterval(fetchCount, 60000);
        return () => clearInterval(interval);
    }, []);

    const links = [
        { name: "Dashboard",    href: "/superadmin",            icon: LayoutDashboard },
        { name: "Manage Ads",   href: "/superadmin/ads",        icon: Megaphone },
        { name: "Manage Pools", href: "/superadmin/pools",      icon: Droplets },
        { name: "Manage Hostels", href: "/superadmin/hostels",  icon: Building2 },
        { name: "Manage Businesses", href: "/superadmin/businesses", icon: Briefcase },
        { name: "Leads & Demos", href: "/superadmin/demo",     icon: Calendar, badge: newLeadCount },
        { name: "Feedback",     href: "/superadmin/feedback",   icon: MessageSquare },
        { name: "Billing",      href: "/superadmin/billing",    icon: CreditCard },
        { name: "Referrals",    href: "/superadmin/referrals",  icon: Gift },
        { name: "Pending Registrations", href: "/superadmin/pending-registrations", icon: LayoutDashboard },
    ];

    return (
        <div className="flex h-full w-52 flex-col bg-[#020617] text-[#f9fafb] border-r border-[#1f2937]">
            {/* Logo area */}
            <div className="flex h-16 items-center px-4 gap-3 border-b border-[#1f2937]">
                <div className="w-8 h-8 rounded-xl bg-[#0b1220] flex items-center justify-center border border-[#1f2937]">
                    <Shield className="w-4 h-4 text-[#8b5cf6]" />
                </div>
                <div className="overflow-hidden">
                    <h1 className="text-sm font-bold truncate text-[#f9fafb]">AquaSync</h1>
                    <p className="text-[10px] text-[#9ca3af] font-semibold tracking-wide uppercase">Platform Control</p>
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
                                "group flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 border-l-[3px]",
                                isActive
                                    ? "bg-[#8b5cf6]/10 text-white border-[#8b5cf6]"
                                    : "text-[#9ca3af] border-transparent hover:text-white hover:bg-[#8b5cf6]/5"
                            )}
                        >
                            <item.icon
                                className={clsx(
                                    "w-4 h-4 transition-colors duration-200",
                                    isActive ? "text-white" : "text-[#9ca3af] group-hover:text-white"
                                )}
                            />
                            <span className="text-sm font-medium tracking-tight flex-1">{item.name}</span>
                            {(item as any).badge > 0 && (
                                <span className="min-w-[20px] h-5 flex items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white px-1.5">
                                    {(item as any).badge > 99 ? "99+" : (item as any).badge}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom Section */}
            <div className="p-3 border-t border-[#1f2937] bg-[#020617]">
                <div className="flex items-center gap-2 px-2 py-1.5 mb-2">
                    <div className="w-7 h-7 rounded-full bg-[#0b1220] flex items-center justify-center border border-[#1f2937]">
                        <span className="text-[10px] font-bold text-[#f9fafb]">S</span>
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-[10px] font-bold truncate text-[#f9fafb]">Super Admin</p>
                        <p className="text-[9px] text-[#9ca3af] truncate">Platform Owner</p>
                    </div>
                </div>
                <button
                    onClick={() => { window.location.href = "/superadmin/login"; }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-[#9ca3af] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                >
                    <LogOut className="w-4 h-4" />
                    <span>Log Out</span>
                </button>
            </div>
        </div>
    );
}
