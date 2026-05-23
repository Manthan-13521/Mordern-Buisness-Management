"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowUpRight, Volume2, VolumeX } from "lucide-react";
import { useAdSlot, useAdTrack } from "../AdProvider";
import { AdSlotName, SLOT_CONSTRAINTS } from "@/lib/ad-slots";
import { AdSlotSkeleton } from "./AdSlotSkeleton";
import { CarouselAd } from "./CarouselAd";

interface NativeAdSlotProps {
    slotName: AdSlotName;
    className?: string;
}

export function NativeAdSlot({ slotName, className = "" }: NativeAdSlotProps) {
    const context = useAdSlot(slotName);
    const trackEvent = useAdTrack();
    const [isMounted, setIsMounted] = useState(false);
    const [isVisible, setIsVisible] = useState(true);
    const [isMuted, setIsMuted] = useState(true);
    const adRef = useRef<HTMLDivElement>(null);
    const impressionFired = useRef(false);
    const viewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const constraints = SLOT_CONSTRAINTS[slotName];

    useEffect(() => {
        setIsMounted(true);

        if (constraints.hideOnMobile && window.innerWidth < 640) {
            setIsVisible(false);
        }
        
        const handleResize = () => {
            if (constraints.hideOnMobile && window.innerWidth < 640) {
                setIsVisible(false);
            } else if (constraints.minWidth > 0 && window.innerWidth < constraints.minWidth) {
                setIsVisible(false);
            } else {
                setIsVisible(true);
            }
        };

        window.addEventListener("resize", handleResize);
        handleResize();

        return () => window.removeEventListener("resize", handleResize);
    }, [constraints]);

    useEffect(() => {
        if (!context || !isVisible || !adRef.current) return;
        if (Array.isArray(context)) return;

        const ad = context;
        impressionFired.current = false;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    if (!impressionFired.current && !viewTimerRef.current) {
                        viewTimerRef.current = setTimeout(() => {
                            if (!impressionFired.current) {
                                impressionFired.current = true;
                                trackEvent(ad._id, "impression", slotName);
                            }
                            viewTimerRef.current = null;
                        }, 1000);
                    }
                } else {
                    if (viewTimerRef.current) {
                        clearTimeout(viewTimerRef.current);
                        viewTimerRef.current = null;
                    }
                }
            });
        }, { threshold: 0.5 });

        observer.observe(adRef.current);
        return () => {
            observer.disconnect();
            if (viewTimerRef.current) {
                clearTimeout(viewTimerRef.current);
                viewTimerRef.current = null;
            }
        };
    }, [context, isVisible, trackEvent, slotName]);

    if (!isMounted) return <AdSlotSkeleton slotName={slotName} className={className} />;
    if (!isVisible || !context) return null;

    if (Array.isArray(context)) {
        return <CarouselAd slotName={slotName} ads={context} className={className} />;
    }

    const ad = context;
    const isVideo = ad.videoUrl && ad.videoUrl.length > 0;

    const handleAdClick = () => {
        trackEvent(ad._id, "click", slotName);
        if (ad.targetUrl) {
            let url = ad.targetUrl;
            if (!/^https?:\/\//i.test(url) && !url.startsWith('/')) {
                url = 'https://' + url;
            }
            window.open(url, "_blank", "noopener,noreferrer");
        }
    };

    const baseClasses = `w-full rounded-2xl border overflow-hidden flex flex-col group relative transition-all duration-300 ${className}`;
    let modeClasses = "";
    
    switch (ad.designMode || constraints.designMode) {
        case "premium":
            modeClasses = "bg-[#0f172a] border-[#8b5cf6]/30 hover:border-[#8b5cf6]/60 shadow-lg shadow-[#8b5cf6]/10";
            break;
        case "glass":
            modeClasses = "bg-white/5 backdrop-blur-md border-white/10 hover:border-white/20 hover:bg-white/10";
            break;
        case "minimal":
            modeClasses = "bg-transparent border-transparent hover:bg-white/5";
            break;
        case "compact":
            modeClasses = "bg-[#020617] border-[#1e293b] hover:border-[#334155]";
            break;
        default:
            modeClasses = "bg-[#0b1220] border-[#1f2937] hover:border-[#374151]";
            break;
    }

    return (
        <div ref={adRef} className={`${baseClasses} ${modeClasses}`} onClick={handleAdClick}>
            <div className="absolute top-3 left-3 z-20">
                <span className="px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-white/90 bg-black/40 backdrop-blur-md rounded-md border border-white/10">
                    Sponsored
                </span>
            </div>

            <div className="relative w-full overflow-hidden cursor-pointer bg-black" style={{ minHeight: `${Math.max(constraints.minHeight - 80, 100)}px` }}>
                {isVideo ? (
                    <div className="relative w-full h-full">
                        <video 
                            src={ad.videoUrl} 
                            autoPlay 
                            muted={isMuted} 
                            loop 
                            playsInline 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                        <button 
                            onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
                            className="absolute bottom-3 right-3 z-20 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/80 backdrop-blur-sm transition"
                        >
                            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                        </button>
                    </div>
                ) : (
                    <Image 
                        src={ad.imageUrl} 
                        alt={ad.title} 
                        fill 
                        className="object-cover group-hover:scale-105 transition-transform duration-700" 
                        sizes="(max-width: 768px) 100vw, 33vw"
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>

            {(ad.designMode || constraints.designMode) !== "minimal" && (
                <div className="p-4 flex items-end justify-between cursor-pointer border-t border-white/5 relative z-10 bg-inherit">
                    <div className="flex-1 min-w-0 pr-4">
                        <h4 className="text-sm font-bold text-white truncate">{ad.title}</h4>
                        {ad.description && (
                            <p className="text-xs text-white/60 mt-1 line-clamp-1">{ad.description}</p>
                        )}
                    </div>
                    <button className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors border border-white/10">
                        {ad.ctaText || "Learn More"}
                        <ArrowUpRight className="w-3 h-3" />
                    </button>
                </div>
            )}
        </div>
    );
}
