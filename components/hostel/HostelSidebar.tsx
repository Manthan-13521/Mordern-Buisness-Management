"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import clsx from "clsx";
import {
    LayoutDashboard,
    Users,
    CreditCard,
    History,
    Settings,
    UserX,
    IndianRupee,
    UserCog,
    MessageSquare,
    Building2,
    ClipboardList,
    LogOut,
    BedDouble,
    PieChart,
} from "lucide-react";

export function HostelSidebar() {
    const pathname = usePathname();
    const { data: session } = useSession();

    const match = pathname.match(/^\/hostel\/([^/]+)\/admin/);
    const hostelSlug = match?.[1] ?? "";
    const base = `/hostel/${hostelSlug}/admin`;

    const links = [
        { name: "Dashboard",         href: `${base}/dashboard`,        icon: LayoutDashboard },
        { name: "Hostel Overview",   href: `${base}/overview`,          icon: Building2 },
        { name: "Members",           href: `${base}/members`,           icon: Users },
        { name: "Defaulters",        href: `${base}/expired-members`,   icon: UserX },
        { name: "Balance Payments",  href: `${base}/balance-payments`,  icon: IndianRupee },
        { name: "Plans",             href: `${base}/plans`,             icon: ClipboardList },
        { name: "Payments",          href: `${base}/payments`,          icon: CreditCard },
        { name: "Staff",             href: `${base}/staff`,             icon: UserCog },
        { name: "Graph Analysis",    href: `${base}/graph-analysis`,    icon: PieChart },
        { name: "WhatsApp",          href: `${base}/whatsapp`,          icon: MessageSquare },
        { name: "Hostel Settings",   href: `${base}/hostel-settings`,   icon: BedDouble },
        { name: "Settings",          href: `${base}/settings`,          icon: Settings },
    ];

    return (
        <div className="flex h-full w-64 flex-col bg-slate-900 text-white">
            {/* Logo / Name */}
            <div className="flex h-16 items-center justify-center border-b border-slate-700/60 px-4 gap-2">
                <Building2 className="w-6 h-6 text-indigo-400 flex-shrink-0" />
                <div className="text-center leading-tight">
                    <p className="text-sm font-bold text-white truncate max-w-[160px]">
                        {(session?.user as any)?.hostelName || "Hostel"}
                    </p>
                    <p className="text-[10px] text-slate-400 font-normal">Management System</p>
                </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 space-y-0.5 px-2 py-3 overflow-y-auto">
                {links.map((item) => {
                    const isActive = pathname.startsWith(item.href);
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={clsx(
                                "group flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-all",
                                isActive
                                    ? "bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 border-0 text-white shadow-md shadow-indigo-900/40"
                                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                            )}
                        >
                            <item.icon
                                className={clsx(
                                    "mr-3 h-4 w-4 flex-shrink-0",
                                    isActive ? "text-indigo-200" : "text-slate-400 group-hover:text-slate-300"
                                )}
                                aria-hidden="true"
                            />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="border-t border-slate-700/60 p-3 space-y-2">
                <div className="px-3 py-1">
                    <p className="text-xs text-slate-400 truncate">{session?.user?.email}</p>
                </div>
                <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-red-900/30 hover:text-red-400 transition-colors"
                >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                </button>
                <p className="text-center text-[10px] text-slate-600 pb-1">Hostel v1.0.0</p>
            </div>
        </div>
    );
}
