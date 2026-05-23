"use client";

import { useEffect, useState, useCallback } from "react";
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
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
            >
                <div className="relative w-[90vw] max-w-[840px] h-[80vh] max-h-[720px] flex flex-col items-center justify-center">
                    {/* Progress indicators if multiple ads */}
                    {ads.length > 1 && (
                        <div className="absolute top-6 left-0 right-0 z-[110] flex justify-center gap-2 px-8">
                            {ads.map((ad, idx) => (
                                <div
                                    key={ad._id}
                                    className={`h-1.5 rounded-full flex-1 transition-all duration-300 ${
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
                            className="relative w-full h-full bg-[#09090b] rounded-[2rem] overflow-hidden shadow-2xl cursor-pointer border border-white/10"
                            onClick={() => onClick(currentAd)}
                        >
                            {/* Close Button inside the card for sleek design & positioning */}
                            <button
                                onClick={handleDismiss}
                                className="absolute top-6 right-6 z-[110] p-2 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full text-white transition-colors border border-white/10"
                                aria-label="Close"
                            >
                                <X className="w-6 h-6" />
                            </button>

                            {/* Background Image Layer */}
                            <div className="absolute inset-0">
                                <Image
                                    src={currentAd.imageUrl}
                                    alt={currentAd.title}
                                    fill
                                    className="object-cover"
                                    priority
                                    sizes="(max-width: 768px) 100vw, 840px"
                                />
                                {/* Gradient Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent" />
                            </div>

                            {/* Content Layer */}
                            <div className="absolute inset-0 p-6 sm:p-12 flex flex-col justify-end">
                                <motion.div
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.2, duration: 0.4 }}
                                    className="max-w-2xl"
                                >
                                    <span className="inline-block px-4 py-1.5 mb-4 text-xs sm:text-sm font-bold tracking-wider text-white uppercase bg-white/10 backdrop-blur-md rounded-full border border-white/10">
                                        Sponsored
                                    </span>
                                    <h2 className="text-3xl sm:text-5xl font-extrabold text-white leading-tight mb-4 tracking-tight">
                                        {currentAd.title}
                                    </h2>
                                    {currentAd.description && (
                                        <p className="text-sm sm:text-lg text-gray-300 mb-6 sm:mb-8 line-clamp-3 leading-relaxed">
                                            {currentAd.description}
                                        </p>
                                    )}
                                    <button
                                        className="w-full sm:w-auto px-8 py-4 text-xs sm:text-sm font-bold text-black uppercase bg-white rounded-full hover:scale-[1.02] active:scale-95 transition-transform"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onClick(currentAd);
                                        }}
                                    >
                                        Learn More
                                    </button>
                                </motion.div>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
