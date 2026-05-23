"use client";

import { X } from "lucide-react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";

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

    const handleAdClick = () => {
        if (ad.targetUrl) {
            let url = ad.targetUrl;
            if (!/^https?:\/\//i.test(url) && !url.startsWith('/')) {
                url = 'https://' + url;
            }
            window.open(url, "_blank", "noopener,noreferrer");
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 backdrop-blur-md p-2 sm:p-4"
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="relative w-[98vw] h-[98vh] bg-[#09090b] rounded-[1.5rem] sm:rounded-[2rem] overflow-hidden shadow-2xl border border-white/10 flex flex-col items-center justify-center cursor-pointer"
                    onClick={handleAdClick}
                >
                    {/* Close Button inside the card for sleek design & positioning */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onClose();
                        }}
                        className="absolute top-4 right-4 sm:top-6 sm:right-6 z-[130] p-2 bg-black/50 hover:bg-black/70 backdrop-blur-md rounded-full text-white transition-colors border border-white/10"
                        aria-label="Close"
                    >
                        <X className="w-6 h-6" />
                    </button>

                    {/* Full screen Ad Image */}
                    <div className="relative w-full h-full">
                        <Image
                            src={ad.imageUrl}
                            alt={ad.title}
                            fill
                            className="object-contain"
                            priority
                            sizes="98vw"
                        />
                    </div>

                    {/* Tiny "Click to learn more" hint at the bottom center if targetUrl exists */}
                    {ad.targetUrl && (
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[130] px-4 py-2 bg-black/65 backdrop-blur-md text-white/90 text-xs sm:text-sm font-semibold rounded-full border border-white/10 transition-transform hover:scale-105 pointer-events-none">
                            Click anywhere to learn more ↗
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
