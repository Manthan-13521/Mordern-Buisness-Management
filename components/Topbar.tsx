"use client";

import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { LogOut, User as UserIcon, Menu, X } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { usePathname } from "next/navigation";

const PAGE_TITLES: Record<string, string> = {
    "/dashboard":        "Dashboard",
    "/entry":            "QR Entry",
    "/members":          "Members",
    "/expired-members":  "Expired Members",
    "/plans":            "Plans",
    "/payments":         "Payments",
    "/balance-payments": "Balance Payments",
    "/staff":            "Staff",
    "/competitions":     "Competitions",
    "/notifications":    "Notifications",
    "/revenue-analytics": "Revenue Analytics",
    "/twilio":           "WhatsApp",
    "/settings":         "Settings",
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
                    <div className="relative flex w-64 flex-col">
                        <Sidebar />
                    </div>
                    <div
                        className="flex-1 bg-black/60 backdrop-blur-sm"
                        onClick={() => setMobileOpen(false)}
                    />
                </div>
            )}

            <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/5 bg-slate-950/20 backdrop-blur-md px-4 shadow-sm sm:px-6 lg:px-8 bg-background">
                <div className="flex flex-1 items-center gap-3">
                    <button
                        className="md:hidden rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 flex-shrink-0"
                        onClick={() => setMobileOpen(!mobileOpen)}
                        aria-label="Toggle menu"
                    >
                        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </button>
                    <div className="md:hidden flex items-center">
                        <h1 className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{title}</h1>
                    </div>
                </div>
                <div className="flex items-center gap-x-4 lg:gap-x-6">
                    <div className="flex items-center gap-x-4 lg:gap-x-6">
                        <div className="flex items-center gap-x-2 text-sm font-semibold leading-6 text-gray-900 dark:text-white">
                            <span className="sr-only">Your profile</span>
                            <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 border-0 flex items-center justify-center text-white">
                                <UserIcon className="h-5 w-5" />
                            </div>
                            <span aria-hidden="true" className="hidden sm:block">
                                {session?.user?.role === "admin" || session?.user?.role === "superadmin"
                                    ? `${session?.user?.poolName || "Pool"} (Admin)`
                                    : `${session?.user?.name || "User"} (${session?.user?.role})`}
                            </span>
                        </div>

                        <button
                            onClick={() => signOut({ callbackUrl: "/login" })}
                            className="flex items-center gap-2 rounded-md bg-transparent px-3 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                        >
                            <LogOut className="h-4 w-4" />
                            <span className="hidden sm:block">Logout</span>
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
