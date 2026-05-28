"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { AlertCircle, AlertTriangle, ArrowRight, ShieldAlert, Sparkles, Eye } from "lucide-react";
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

    // 1. Grace (status === "grace" or "expired") → Strong red banner with read-only message
    // 2. Expiring soon (daysLeft <= 3) → Yellow warning banner
    // 3. Otherwise → Hidden
    const isExpired = subStatus === "expired" || subStatus === "grace";
    const isExpiringSoon = daysLeft !== null && daysLeft <= 3 && daysLeft > 0;

    if (!isExpired && !isExpiringSoon) return null;

    if (isExpired) {
        // ── EXPIRED: Strong red banner — read-only mode ──
        return (
            <div className="relative w-full py-3 px-4 flex flex-col md:flex-row items-center justify-center gap-3 text-center transition-all animate-in slide-in-from-top duration-500 z-[9999] bg-red-600/95 text-white">
                <div className="flex items-center gap-3">
                    <ShieldAlert className="h-5 w-5 animate-pulse flex-shrink-0" />
                    <span className="font-bold text-sm uppercase tracking-tight">
                        Plan Expired — Dashboard is Read-Only
                    </span>
                </div>

                <div className="flex items-center gap-2 text-xs opacity-90">
                    <Eye className="h-3.5 w-3.5" />
                    <span>Your data is visible but edits are disabled.</span>
                </div>

                <Link 
                    href="/renew-plan"
                    className="px-4 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-widest border bg-white text-red-600 border-white hover:bg-red-50 transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                >
                    Renew Now <ArrowRight className="h-3 w-3" />
                </Link>
                
                {/* Gloss Effect Overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-[-20deg] translate-x-[-100%] animate-[shimmer_2.5s_infinite_ease-in-out]" />
            </div>
        );
    }

    // ── EXPIRING SOON (≤3 days): Yellow warning banner ──
    return (
        <div className="relative w-full py-2 px-4 flex flex-col md:flex-row items-center justify-center gap-3 text-center transition-all animate-in slide-in-from-top duration-500 z-[9999] bg-amber-500/90 text-slate-900">
            <AlertTriangle className="h-5 w-5 animate-bounce" />
            <span className="font-bold text-sm uppercase tracking-tight">
                Your plan expires in {daysLeft} day{daysLeft !== 1 ? "s" : ""}. Renew now to avoid interruption.
            </span>

            <Link 
                href="/renew-plan"
                className="px-3 py-1 rounded-lg font-black text-[10px] uppercase tracking-widest border bg-slate-950 text-amber-400 border-slate-950 shadow-amber-900/20 transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
            >
                Renew Plan <ArrowRight className="h-3 w-3" />
            </Link>
            
            {/* Gloss Effect Overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-[-20deg] translate-x-[-100%] animate-[shimmer_2.5s_infinite_ease-in-out]" />
        </div>
    );
}
