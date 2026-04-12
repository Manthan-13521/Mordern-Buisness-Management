"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
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
    PieChart,
    BadgeDollarSign,
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
        { name: "Notifications",    href: `${basePath}/notifications`,     icon: Bell,             roles: ["admin", "operator"] },
        { name: "Graph Analysis",   href: `${basePath}/graph-analysis`,    icon: PieChart,         roles: ["admin"] },
        { name: "Revenue Analytics", href: `${basePath}/revenue-analytics`,  icon: BadgeDollarSign,  roles: ["admin"] },
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
        <div className="flex h-full w-64 flex-col bg-gray-900 text-white">
            <div className="flex h-16 items-center justify-center border-b border-gray-800">
                <h1 className="text-xl font-bold text-center leading-tight px-4">
                    {session?.user?.poolName || "Pool Name"} <br /><span className="text-xs text-gray-400 font-normal">Management System</span>
                </h1>
            </div>
            <nav className="flex-1 space-y-1 px-2 py-4">
                {filteredLinks.map((item) => {
                    const isActive = pathname.startsWith(item.href);
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={clsx(
                                isActive
                                    ? "bg-gray-800 text-white"
                                    : "text-gray-300 hover:bg-gray-700 hover:text-white",
                                "group flex items-center rounded-md px-2 py-2 text-sm font-medium transition-colors"
                            )}
                        >
                            <item.icon
                                className={clsx(
                                    isActive ? "text-gray-300" : "text-gray-400 group-hover:text-gray-300",
                                    "mr-3 h-5 w-5 flex-shrink-0"
                                )}
                                aria-hidden="true"
                            />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>
            <div className="p-4 border-t border-gray-800 text-xs text-gray-500 text-center">
                v2.0.0 — Production
            </div>
        </div>
    );
}
