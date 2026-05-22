"use client";

import Image from "next/image";
import { X } from "lucide-react";
import { useState } from "react";

interface CornerAdProps {
    ad: {
        _id: string;
        title: string;
        imageUrl: string;
    };
    onClick: () => void;
}

export function CornerAd({ ad, onClick }: CornerAdProps) {
    const [isVisible, setIsVisible] = useState(true);

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-6 right-6 z-40 animate-in slide-in-from-bottom-5 fade-in duration-300">
            <div className="relative group w-48 bg-[#0f172a] border border-[#1e293b] rounded-xl shadow-lg overflow-hidden cursor-pointer hover:border-[#8b5cf6]/50 transition-colors">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsVisible(false);
                    }}
                    className="absolute top-1 right-1 z-10 p-1 bg-black/50 hover:bg-black/80 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    <X className="w-3 h-3" />
                </button>
                
                <div onClick={onClick} className="w-full h-auto">
                    <div className="relative w-full aspect-[4/3] bg-[#020617]">
                        <Image
                            src={ad.imageUrl}
                            alt={ad.title}
                            fill
                            className="object-cover"
                            sizes="12rem"
                        />
                    </div>
                    <div className="p-2.5">
                        <p className="text-xs font-semibold text-white truncate">{ad.title}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
