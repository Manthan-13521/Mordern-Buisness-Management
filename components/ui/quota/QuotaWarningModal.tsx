"use client";

import React, { useEffect, useState } from "react";
import { quotaEvents } from "@/lib/quotaEvents";
import { AlertTriangle, Lock, Star } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UPGRADE_ROUTE } from "@/lib/subscriptionConfig";

export default function QuotaWarningModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [resourceName, setResourceName] = useState("");
    const pathname = usePathname();

    useEffect(() => {
        // Subscribe to direct events
        const unsubscribe = quotaEvents.subscribe((resource) => {
            setResourceName(resource);
            setIsOpen(true);
        });

        // Global fetch interceptor to catch QUOTA_EXCEEDED gracefully
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            const response = await originalFetch(...args);
            if (response.status === 403) {
                // Clone so we don't consume the original response stream
                const clone = response.clone();
                try {
                    const data = await clone.json();
                    if (data?.error === "QUOTA_EXCEEDED") {
                        quotaEvents.emit(data.resource || "resource");
                    }
                } catch (e) {
                    // ignore json parsing errors for non-json 403s
                }
            }
            return response;
        };

        return () => {
            unsubscribe();
            window.fetch = originalFetch; // restore
        };
    }, []);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-[#0b1220] rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-[#1f2937] animate-in fade-in zoom-in duration-200">
                <div className="p-6 text-center">
                    <div className="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
                        <Lock className="w-8 h-8" />
                    </div>
                    
                    <h3 className="text-xl font-bold text-[#f9fafb] mb-2">
                        Trial Limit Reached
                    </h3>
                    
                    <p className="text-[#9ca3af] mb-6">
                        You have reached the maximum number of <strong className="text-[#f9fafb]">{resourceName}</strong> allowed on the Free Trial. Upgrade to a premium plan to unlock unlimited access and grow your business.
                    </p>

                    <div className="bg-[#020617] rounded-xl p-4 mb-6 text-left space-y-3 border border-[#1f2937]">
                        <div className="flex items-center gap-3 text-sm text-[#d1d5db]">
                            <Star className="w-4 h-4 text-[#8b5cf6]" /> Unlimited {resourceName}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-[#d1d5db]">
                            <Star className="w-4 h-4 text-[#8b5cf6]" /> Full WhatsApp Automation
                        </div>
                        <div className="flex items-center gap-3 text-sm text-[#d1d5db]">
                            <Star className="w-4 h-4 text-[#8b5cf6]" /> Advanced Analytics & Exports
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={() => setIsOpen(false)}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-[#1f2937] text-[#9ca3af] font-medium hover:bg-[#1f2937]/50 transition-colors"
                        >
                            Maybe Later
                        </button>
                        <Link
                            href={`${UPGRADE_ROUTE}?returnTo=${encodeURIComponent(pathname || "/")}`}
                            onClick={() => setIsOpen(false)}
                            className="flex-1 px-4 py-2.5 rounded-xl bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-medium shadow-lg shadow-[#8b5cf6]/30 transition-all active:scale-95 text-center flex items-center justify-center"
                        >
                            Upgrade Now
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
