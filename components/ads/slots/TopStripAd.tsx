"use client";

import { useEffect, useState } from "react";
import { ArrowRight, X } from "lucide-react";
import { useAdSlot } from "../AdProvider";
import { AD_SLOTS } from "@/lib/ad-slots";

export function TopStripAd() {
    const context = useAdSlot(AD_SLOTS.TOP_STRIP);
    const [isVisible, setIsVisible] = useState(true);

    if (!context || !isVisible) return null;

    // Pick first if array
    const ad = Array.isArray(context) ? context[0] : context;
    if (!ad) return null;

    const handleAdClick = () => {
        if (ad.targetUrl) {
            window.open(ad.targetUrl, "_blank", "noopener,noreferrer");
        }
    };

    return (
        <div className="w-full bg-gradient-to-r from-[#8b5cf6]/20 via-[#3b82f6]/20 to-[#8b5cf6]/20 border-b border-[#8b5cf6]/30 px-4 py-2 flex items-center justify-center gap-4 relative animate-in slide-in-from-top duration-300 backdrop-blur-sm group cursor-pointer" onClick={handleAdClick}>
            
            <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#8b5cf6] text-white uppercase tracking-wider hidden sm:block">
                    Sponsor
                </span>
                <p className="text-sm font-medium text-white/90 group-hover:text-white transition-colors flex items-center gap-2">
                    <span className="font-bold">{ad.title}</span>
                    {ad.description && <span className="hidden md:inline text-white/60">— {ad.description}</span>}
                </p>
                <ArrowRight className="w-4 h-4 text-[#8b5cf6] group-hover:translate-x-1 transition-transform" />
            </div>

            <button 
                onClick={(e) => { e.stopPropagation(); setIsVisible(false); }}
                className="absolute right-4 p-1 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}
