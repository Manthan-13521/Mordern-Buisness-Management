"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

interface IAdData {
    _id: string;
    title: string;
    description?: string;
    imageUrl: string;
    targetUrl?: string;
}

interface PopupAdProps {
    ads: IAdData[];
    onDismiss: () => void;
    onAdDismiss: (adId: string) => void;
    onClick: (ad: IAdData) => void;
    onImpression: (adId: string) => void;
}

export function PopupAd({ ads, onDismiss, onAdDismiss, onClick, onImpression }: PopupAdProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);

    // Initial delay before showing
    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(true), 1500);
        return () => clearTimeout(timer);
    }, []);

    // Auto-slide logic
    useEffect(() => {
        if (!isVisible || ads.length <= 1) return;

        const interval = setInterval(() => {
            setCurrentIndex((prev) => {
                const nextIndex = (prev + 1) % ads.length;
                // Track impression when sliding to next ad
                onImpression(ads[nextIndex]._id);
                return nextIndex;
            });
        }, 6000); // 6 seconds per ad

        return () => clearInterval(interval);
    }, [isVisible, ads, onImpression]);

    if (!isVisible || ads.length === 0) return null;

    const currentAd = ads[currentIndex];

    // Dismiss only current ad or close modal
    const handleDismiss = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (ads.length === 1) {
            setIsVisible(false);
            onDismiss(); // Only 1 ad left, close the whole modal
        } else {
            // Dismiss current ad, move to next
            onAdDismiss(currentAd._id);
            if (currentIndex >= ads.length - 1) {
                setCurrentIndex(0);
            }
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                key="overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-2 sm:p-4"
            >
                <div className="relative w-[98vw] h-[98vh] flex flex-col items-center justify-center">
                    {/* Close Button */}
                    <button
                        onClick={handleDismiss}
                        className="absolute top-4 right-4 sm:top-6 sm:right-6 z-[130] p-2 bg-black/50 hover:bg-black/70 backdrop-blur-md rounded-full text-white transition-colors border border-white/10"
                        aria-label="Close"
                    >
                        <X className="w-6 h-6" />
                    </button>

                    {/* Progress indicators if multiple ads */}
                    {ads.length > 1 && (
                        <div className="absolute top-6 left-0 right-0 z-[130] flex justify-center gap-2 px-8 max-w-lg mx-auto">
                            {ads.map((ad, idx) => (
                                <div
                                    key={ad._id}
                                    className={`h-1 rounded-full flex-1 transition-all duration-300 ${
                                        idx === currentIndex ? "bg-white" : "bg-white/30"
                                    }`}
                                />
                            ))}
                        </div>
                    )}

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentAd._id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.05 }}
                            transition={{ duration: 0.4, ease: "easeInOut" }}
                            className="relative w-full h-full bg-[#09090b] rounded-[1.5rem] sm:rounded-[2rem] overflow-hidden shadow-2xl cursor-pointer border border-white/10 flex items-center justify-center"
                            onClick={() => onClick(currentAd)}
                        >
                            {/* Pure Full Screen Ad Image using object-contain to prevent text cropping */}
                            <div className="relative w-full h-full">
                                <Image
                                    src={currentAd.imageUrl}
                                    alt={currentAd.title}
                                    fill
                                    className="object-contain"
                                    priority
                                    sizes="98vw"
                                />
                            </div>

                            {/* Tiny "Click to learn more" hint at the bottom center if targetUrl exists */}
                            {currentAd.targetUrl && (
                                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[130] px-4 py-2 bg-black/65 backdrop-blur-md text-white/90 text-xs sm:text-sm font-semibold rounded-full border border-white/10 transition-transform hover:scale-105 pointer-events-none">
                                    Click anywhere to learn more ↗
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
