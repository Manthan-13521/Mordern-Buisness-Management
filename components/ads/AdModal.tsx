"use client";

import { X } from "lucide-react";
import Image from "next/image";

interface AdModalProps {
    isOpen: boolean;
    onClose: () => void;
    ad: {
        _id: string;
        title: string;
        description?: string;
        imageUrl: string;
        targetUrl?: string;
    } | null;
}

export function AdModal({ isOpen, onClose, ad }: AdModalProps) {
    if (!isOpen || !ad) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="relative w-full max-w-lg bg-[#0f172a] border border-[#1e293b] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 z-10 p-1.5 bg-black/50 hover:bg-black/80 rounded-full text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="relative w-full aspect-video bg-[#020617]">
                    <Image
                        src={ad.imageUrl}
                        alt={ad.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 32rem"
                    />
                </div>

                <div className="p-6">
                    <h2 className="text-xl font-bold text-white mb-2">{ad.title}</h2>
                    {ad.description && (
                        <p className="text-[#9ca3af] text-sm mb-6 leading-relaxed">
                            {ad.description}
                        </p>
                    )}
                    
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-[#9ca3af] hover:text-white transition-colors"
                        >
                            Close
                        </button>
                        {ad.targetUrl && (
                            <a
                                href={ad.targetUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-5 py-2 text-sm font-medium bg-[#8b5cf6] hover:bg-[#7c3aed] text-white rounded-lg transition-colors"
                            >
                                Learn More
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
