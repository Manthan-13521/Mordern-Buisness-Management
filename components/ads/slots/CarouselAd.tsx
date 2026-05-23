"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { ArrowUpRight, Volume2, VolumeX, ChevronLeft, ChevronRight } from "lucide-react";
import { AdSlotName, SLOT_CONSTRAINTS } from "@/lib/ad-slots";

interface CarouselAdProps {
    slotName: AdSlotName;
    ads: any[];
    className?: string;
}

export function CarouselAd({ slotName, ads, className = "" }: CarouselAdProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isMuted, setIsMuted] = useState(true);
    const [isPaused, setIsPaused] = useState(false);
    const constraints = SLOT_CONSTRAINTS[slotName];

    useEffect(() => {
        if (ads.length <= 1 || isPaused) return;

        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % ads.length);
        }, 6000); // Rotate every 6 seconds

        return () => clearInterval(timer);
    }, [ads.length, isPaused]);

    if (!ads || ads.length === 0) return null;

    const ad = ads[currentIndex];
    const isVideo = ad.videoUrl && ad.videoUrl.length > 0;

    const handleAdClick = () => {
        if (ad.targetUrl) {
            window.open(ad.targetUrl, "_blank", "noopener,noreferrer");
        }
    };

    const nextAd = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev + 1) % ads.length);
    };

    const prevAd = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev - 1 + ads.length) % ads.length);
    };

    // Design Mode Classes
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
        default: // standard
            modeClasses = "bg-[#0b1220] border-[#1f2937] hover:border-[#374151]";
            break;
    }

    return (
        <div 
            className={`${baseClasses} ${modeClasses}`} 
            onClick={handleAdClick}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
        >
            {/* SPONSORED BADGE */}
            <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
                <span className="px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-white/90 bg-black/40 backdrop-blur-md rounded-md border border-white/10">
                    Sponsored
                </span>
                {ads.length > 1 && (
                    <span className="px-2 py-1 text-[9px] font-bold text-white/80 bg-black/40 backdrop-blur-md rounded-md">
                        {currentIndex + 1} / {ads.length}
                    </span>
                )}
            </div>

            {/* NAVIGATION CONTROLS (Only if multiple ads) */}
            {ads.length > 1 && (
                <>
                    <button onClick={prevAd} className="absolute left-2 top-1/2 -translate-y-1/2 z-30 p-1.5 rounded-full bg-black/50 hover:bg-black/80 text-white opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button onClick={nextAd} className="absolute right-2 top-1/2 -translate-y-1/2 z-30 p-1.5 rounded-full bg-black/50 hover:bg-black/80 text-white opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </>
            )}

            {/* MEDIA ASSET (Fading Transition) */}
            <div className="relative w-full overflow-hidden cursor-pointer bg-black" style={{ minHeight: `${Math.max(constraints.minHeight - 80, 100)}px` }}>
                {ads.map((a, i) => (
                    <div 
                        key={a._id}
                        className={`absolute inset-0 transition-opacity duration-1000 ${i === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                    >
                        {(a.videoUrl && a.videoUrl.length > 0) ? (
                            <div className="relative w-full h-full">
                                {i === currentIndex && (
                                    <video 
                                        src={a.videoUrl} 
                                        autoPlay 
                                        muted={isMuted} 
                                        loop 
                                        playsInline 
                                        className="w-full h-full object-cover"
                                    />
                                )}
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
                                    className="absolute bottom-3 right-3 z-20 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/80 backdrop-blur-sm transition"
                                >
                                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                                </button>
                            </div>
                        ) : (
                            <Image 
                                src={a.imageUrl} 
                                alt={a.title} 
                                fill 
                                className="object-cover" 
                                sizes="(max-width: 768px) 100vw, 33vw"
                            />
                        )}
                    </div>
                ))}
                {/* Gradient overlay for text readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 pointer-events-none" />
            </div>

            {/* CONTENT BANNER */}
            {(ad.designMode || constraints.designMode) !== "minimal" && (
                <div className="p-4 flex items-end justify-between cursor-pointer border-t border-white/5 relative z-10 bg-inherit">
                    <div className="flex-1 min-w-0 pr-4">
                        <h4 className="text-sm font-bold text-white truncate transition-all">{ad.title}</h4>
                        {ad.description && (
                            <p className="text-xs text-white/60 mt-1 line-clamp-1 transition-all">{ad.description}</p>
                        )}
                    </div>
                    <button className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors border border-white/10">
                        {ad.ctaText || "Learn More"}
                        <ArrowUpRight className="w-3 h-3" />
                    </button>
                </div>
            )}
            
            {/* PROGRESS BAR */}
            {ads.length > 1 && (
                <div className="absolute bottom-0 left-0 h-1 bg-[#8b5cf6] transition-all duration-[6000ms] ease-linear z-20" 
                    style={{ width: isPaused ? '100%' : '100%', left: isPaused ? '0' : '-100%', transform: isPaused ? 'none' : 'translateX(100%)' }}
                />
            )}
        </div>
    );
}
