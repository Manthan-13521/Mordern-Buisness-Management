"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { AlertCircle, AlertTriangle, ArrowRight, ShieldAlert, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

export function SubscriptionBanner() {
    const { data: session } = useSession() as any;
    const [status, setStatus] = useState<any>(null);

    useEffect(() => {
        if (session?.user?.id) {
            fetch("/api/subscription/status")
                .then(r => r.json())
                .then(data => setStatus(data))
                .catch(err => console.error("Banner status fetch failed", err));
        }
    }, [session?.user?.id]);

    if (!session || !status) return null;

    // Superadmin never sees the banner
    if (session.user.role === "superadmin") return null;

    const { daysLeft, status: subStatus } = status;

    // Logic:
    // 1. Expired (status === "expired") → Red Banner
    // 2. Expiring soon (daysLeft < 7) → Yellow Banner
    // 3. Otherwise → Hidden

    const isExpired = subStatus === "expired";
    const isExpiringSoon = daysLeft !== null && daysLeft <= 7 && daysLeft > 0;

    if (!isExpired && !isExpiringSoon) return null;

    return (
        <div className={`relative w-full py-2 px-4 flex flex-col md:flex-row items-center justify-center gap-3 text-center transition-all animate-in slide-in-from-top duration-500 z-[9999] ${isExpired ? "bg-red-600/90 text-white" : "bg-amber-500/90 text-slate-900"}`}>
            {isExpired ? (
                <>
                    <ShieldAlert className="h-5 w-5 animate-pulse" />
                    <span className="font-bold text-sm uppercase tracking-tight">Access Restricted — Subscription Expired</span>
                </>
            ) : (
                <>
                    <AlertTriangle className="h-5 w-5 animate-bounce" />
                    <span className="font-bold text-sm uppercase tracking-tight">Renewal Needed — Your plan expires in {daysLeft} day{daysLeft !== 1 ? "s" : ""}</span>
                </>
            )}

            <div className="flex items-center gap-3">
                <Link 
                    href="/select-plan"
                    className={`px-3 py-1 rounded-lg font-black text-[10px] uppercase tracking-widest border transition-all flex items-center gap-1.5 shadow-sm active:scale-95 ${isExpired ? "bg-white text-red-600 border-white hover:bg-red-50" : "bg-slate-950 text-amber-400 border-slate-950 shadow-amber-900/20"}`}
                >
                    Renew Plan <ArrowRight className="h-3 w-3" />
                </Link>
                
                {isExpired && (
                    <span className="hidden lg:block text-[10px] italic opacity-80">Payment required to continue operations.</span>
                )}
            </div>
            
            {/* Gloss Effect Overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-[-20deg] translate-x-[-100%] animate-[shimmer_2.5s_infinite_ease-in-out]" />
        </div>
    );
}
