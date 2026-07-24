"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import clsx from "clsx";
import {
    LayoutDashboard,
    Users,
    CreditCard,
    History,
    Settings,
    Ticket,
    ScanLine,
    Bell,
    UserX,
    IndianRupee,
    UserCog,
    Trophy,
    MessageSquare,
    BadgeDollarSign,
    LogOut,
    Droplets,
} from "lucide-react";

export function Sidebar() {
    const pathname = usePathname();
    const { data: session } = useSession();
    const role = session?.user?.role;

    const match = pathname.match(/^\/pool\/([^/]+)\/admin/);
    const poolSlug = match ? match[1] : "";
    const basePath = poolSlug ? `/pool/${poolSlug}/admin` : "/admin";

    const links = [
        { name: "Dashboard",        href: `${basePath}/dashboard`,        icon: LayoutDashboard, roles: ["admin", "operator"] },
        { name: "QR Entry",         href: `${basePath}/entry`,             icon: ScanLine,         roles: ["admin", "operator"] },
        { name: "Members",          href: `${basePath}/members`,           icon: Users,            roles: ["admin", "operator"] },
        { name: "Expired Members",  href: `${basePath}/expired-members`,   icon: UserX,            roles: ["admin", "operator"] },
        { name: "Plans",            href: `${basePath}/plans`,             icon: Ticket,           roles: ["admin"] },
        { name: "Payments",         href: `${basePath}/payments`,          icon: CreditCard,       roles: ["admin", "operator"] },
        { name: "Balance Payments", href: `${basePath}/balance-payments`,  icon: IndianRupee,      roles: ["admin"] },
        { name: "Staff",            href: `${basePath}/staff`,             icon: UserCog,          roles: ["admin"] },
        { name: "Competitions",     href: `${basePath}/competitions`,      icon: Trophy,           roles: ["admin"] },
        { name: "Analytics",        href: `${basePath}/revenue-analytics`,  icon: BadgeDollarSign,  roles: ["admin"] },
        { name: "WhatsApp",         href: `${basePath}/twilio`,            icon: MessageSquare,    roles: ["admin"] },
        { name: "Settings",         href: `${basePath}/settings`,          icon: Settings,         roles: ["admin"] },
    ];

    const filteredLinks = links.filter(link => role && link.roles.includes(role));

    // Global Unlocker for Chrome/Safari Speech Autoplay Policies
    useEffect(() => {
        const unlockAudio = () => {
            if (typeof window !== "undefined" && window.speechSynthesis) {
                const silent = new SpeechSynthesisUtterance("");
                silent.volume = 0;
                window.speechSynthesis.speak(silent);
                document.removeEventListener("click", unlockAudio);
            }
        };
        if (typeof document !== "undefined") {
            document.addEventListener("click", unlockAudio);
        }
        return () => {
            if (typeof document !== "undefined") {
                document.removeEventListener("click", unlockAudio);
            }
        };
    }, []);

    // Global Voice Alert Poller
    useEffect(() => {
        if (!role) return;

        const checkVoiceAlerts = async () => {
            try {
                const res = await fetch("/api/notifications/voice-alerts");
                if (!res.ok) return;

                const data = await res.json();
                if (data.alerts && data.alerts.length > 0) {
                    const newMessages = data.alerts.map((alert: any) => 
                        `Attention ${alert.name}${alert.quantityText}! Your swimming session time has expired. Please vacate the pool immediately. Extra time will be charged.`
                    );
                    
                    if (typeof window !== "undefined" && window.speechSynthesis) {
                        newMessages.forEach((msg: string) => {
                            const utterance = new SpeechSynthesisUtterance(msg);
                            
                            // Prevent Chrome Garbage Collection from dropping the utterance mid-speech
                            (window as any).speechUtts = (window as any).speechUtts || [];
                            (window as any).speechUtts.push(utterance);

                            window.speechSynthesis.speak(utterance);
                        });
                    }
                }
            } catch (error) {
                console.error("Poller Error:", error);
            }
        };

        const intervalId = setInterval(checkVoiceAlerts, 10000); // Check every 10 seconds
        return () => clearInterval(intervalId);
    }, [role]);

    return (
        <div className="flex h-full w-52 flex-col bg-surface text-foreground border-r border-border">
            {/* Logo area */}
            <div className="flex h-16 items-center px-4 gap-3 border-b border-border">
                <div className="w-8 h-8 rounded-xl bg-background flex items-center justify-center border border-border">
                    <Droplets className="w-4 h-4 text-brand" />
                </div>
                <div className="overflow-hidden">
                    <h1 className="text-sm font-bold truncate text-foreground font-heading">
                        {session?.user?.poolName || "Pool"}
                    </h1>
                    <p className="text-[10px] text-[#9ca3af] font-semibold tracking-wide uppercase">Management</p>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto custom-scrollbar">
                {filteredLinks.map((item) => {
                    const isActive = pathname.startsWith(item.href);
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={clsx(
                                "group flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 border-l-[3px] focus-visible:ring-2 focus-visible:ring-brand",
                                isActive
                                    ? "bg-brand/10 text-brand border-brand"
                                    : "text-muted border-transparent hover:text-foreground hover:bg-brand/5"
                            )}
                        >
                            <item.icon
                                className={clsx(
                                    "w-4 h-4 transition-colors duration-200",
                                    isActive ? "text-brand" : "text-muted group-hover:text-foreground"
                                )}
                            />
                            <span className="text-sm font-medium tracking-tight">{item.name}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom Section */}
            <div className="p-3 border-t border-border bg-surface">
                <div className="flex items-center gap-2 px-2 py-1.5 mb-2">
                    <div className="w-7 h-7 rounded-full bg-background flex items-center justify-center border border-border">
                        <span className="text-[10px] font-bold text-foreground">
                            {session?.user?.name?.[0]?.toUpperCase() ?? "U"}
                        </span>
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-[10px] font-bold truncate text-foreground font-heading">
                            {session?.user?.role === "admin" || session?.user?.role === "superadmin"
                                ? `${session?.user?.poolName || "Pool"} (Admin)`
                                : `${session?.user?.name || "User"}`}
                        </p>
                        <p className="text-[9px] text-muted truncate">{session?.user?.role}</p>
                    </div>
                </div>

                {session?.user?.subscriptionStatus === "none" && session?.user?.role !== "superadmin" && (
                    <div className="mx-2 mb-3 px-3 py-2.5 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                            <Ticket className="w-4 h-4 text-yellow-500" />
                            <p className="text-xs font-bold text-yellow-500 uppercase tracking-wider">Free Trial</p>
                        </div>
                        <p className="text-[10px] text-yellow-500/80 leading-tight">
                            Upgrade to unlock unlimited features.
                        </p>
                    </div>
                )}
                
                <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-[#9ca3af] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                </button>
            </div>
        </div>
    );
}
