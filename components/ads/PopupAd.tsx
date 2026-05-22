"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";

interface PopupAdProps {
    ad: {
        _id: string;
        title: string;
        description?: string;
        imageUrl: string;
        targetUrl?: string;
    };
    onDismiss: () => void;
    onClick: () => void;
}

export function PopupAd({ ad, onDismiss, onClick }: PopupAdProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Slight delay before showing to not block immediate page load
        const timer = setTimeout(() => setIsVisible(true), 1500);
        return () => clearTimeout(timer);
    }, []);

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-300">
            <div className="relative w-full max-w-md bg-[#0f172a] border border-[#1e293b] rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-300">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsVisible(false);
                        onDismiss();
                    }}
                    className="absolute top-3 right-3 z-10 p-1.5 bg-black/50 hover:bg-black/80 rounded-full text-white transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>

                <div 
                    onClick={() => {
                        setIsVisible(false);
                        onClick();
                    }} 
                    className="cursor-pointer"
                >
                    <div className="relative w-full aspect-[21/9] sm:aspect-video bg-[#020617]">
                        <Image
                            src={ad.imageUrl}
                            alt={ad.title}
                            fill
                            className="object-cover"
                            sizes="(max-width: 640px) 100vw, 28rem"
                        />
                    </div>
                    <div className="p-5">
                        <h3 className="text-lg font-bold text-white mb-1.5">{ad.title}</h3>
                        {ad.description && (
                            <p className="text-sm text-[#9ca3af] line-clamp-2">
                                {ad.description}
                            </p>
                        )}
                        <div className="mt-4 flex justify-end">
                            <span className="text-xs font-semibold text-[#8b5cf6]">Learn More &rarr;</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
