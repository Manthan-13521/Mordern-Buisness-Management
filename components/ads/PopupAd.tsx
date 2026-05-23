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
                <div className="relative w-full max-w-[420px] aspect-[4/5] sm:aspect-[3/4] flex flex-col items-center justify-center">
                    {/* Close Button */}
                    <button
                        onClick={handleDismiss}
                        className="absolute -top-12 right-0 z-[110] p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-colors"
                        aria-label="Close"
                    >
                        <X className="w-6 h-6" />
                    </button>

                    {/* Progress indicators if multiple ads */}
                    {ads.length > 1 && (
                        <div className="absolute top-4 left-0 right-0 z-[110] flex justify-center gap-2 px-6">
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
                            {/* Background Image Layer */}
                            <div className="absolute inset-0">
                                <Image
                                    src={currentAd.imageUrl}
                                    alt={currentAd.title}
                                    fill
                                    className="object-cover"
                                    priority
                                    sizes="(max-width: 480px) 100vw, 420px"
                                />
                                {/* Gradient Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                            </div>

                            {/* Content Layer */}
                            <div className="absolute inset-0 p-8 flex flex-col justify-end">
                                <motion.div
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.2, duration: 0.4 }}
                                >
                                    <span className="inline-block px-3 py-1 mb-4 text-xs font-bold tracking-wider text-white uppercase bg-white/20 backdrop-blur-md rounded-full">
                                        Sponsored
                                    </span>
                                    <h2 className="text-3xl font-extrabold text-white leading-tight mb-3">
                                        {currentAd.title}
                                    </h2>
                                    {currentAd.description && (
                                        <p className="text-base text-gray-300 mb-6 line-clamp-3">
                                            {currentAd.description}
                                        </p>
                                    )}
                                    <button
                                        className="w-full py-4 text-sm font-bold text-black uppercase bg-white rounded-full hover:scale-[1.02] active:scale-95 transition-transform"
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
