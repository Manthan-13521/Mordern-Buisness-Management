"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { X, Sparkles } from "lucide-react";

export default function TrialBanner() {
    const [data, setData] = useState<any>(null);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        // Simple session-based dismiss (reappears on next full session/login)
        if (sessionStorage.getItem("trial_banner_dismissed")) {
            setDismissed(true);
            return;
        }

        fetch("/api/quotas")
            .then(res => res.json())
            .then(res => {
                if (res.isTrial) setData(res);
            })
            .catch(() => {});
    }, []);

    if (dismissed || !data) return null;

    const handleDismiss = () => {
        sessionStorage.setItem("trial_banner_dismissed", "true");
        setDismissed(true);
    };

    return (
        <div className="bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white px-4 py-3 relative shadow-md">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-3 text-sm sm:text-base pr-8">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-yellow-300" />
                    <span className="font-semibold">Free Trial Plan</span>
                    <span className="hidden sm:inline">•</span>
                    <span>{data.daysRemaining} days remaining</span>
                </div>
                
                <Link 
                    href="/settings/billing" 
                    className="bg-white text-[#8b5cf6] hover:bg-[#f5f3ff] px-4 py-1.5 rounded-full font-medium transition-colors text-sm shadow-sm"
                >
                    Upgrade Now
                </Link>
            </div>

            <button 
                onClick={handleDismiss}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-white/20 rounded-full transition-colors"
                aria-label="Dismiss banner"
            >
                <X className="w-5 h-5" />
            </button>
        </div>
    );
}
