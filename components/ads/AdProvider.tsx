"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { CornerAd } from "./CornerAd";
import { PopupAd } from "./PopupAd";
import { AdModal } from "./AdModal";

export function AdProvider({ children, moduleName }: { children: React.ReactNode; moduleName: string }) {
    const pathname = usePathname();
    const [cornerAd, setCornerAd] = useState<any>(null);
    const [popupAd, setPopupAd] = useState<any>(null);
    const [activeModalAd, setActiveModalAd] = useState<any>(null);
    
    // Determine the page from the pathname
    const getPageName = useCallback(() => {
        if (!pathname) return "dashboard";
        const parts = pathname.split("/").filter(Boolean);
        const lastPart = parts[parts.length - 1];
        // If the URL ends in "admin", it's the dashboard home for that module.
        if (lastPart === "admin" || lastPart === moduleName) return "dashboard";
        return lastPart;
    }, [pathname, moduleName]);

    const trackEvent = useCallback(async (adId: string, event: "impression" | "click") => {
        try {
            // Use requestIdleCallback if available to avoid blocking main thread
            const track = () => {
                fetch("/api/ads/track", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ adId, event }),
                }).catch(() => {}); // Fire and forget
            };
            if ("requestIdleCallback" in window) {
                (window as any).requestIdleCallback(track);
            } else {
                setTimeout(track, 100);
            }
        } catch (e) {
            // Ignore tracking errors silently
        }
    }, []);

    useEffect(() => {
        const page = getPageName();
        let mounted = true;

        async function fetchAds() {
            try {
                const res = await fetch(`/api/ads/active?module=${moduleName}&page=${page}`);
                if (!res.ok) return;
                const data = await res.json();
                
                if (!mounted) return;

                if (data.cornerAd) {
                    setCornerAd(data.cornerAd);
                    trackEvent(data.cornerAd._id, "impression");
                } else {
                    setCornerAd(null);
                }

                if (data.popupAd) {
                    // Check cooldown
                    const cooldownKey = `ad_popup_dismissed_${data.popupAd._id}`;
                    const lastDismissed = localStorage.getItem(cooldownKey);
                    let shouldShow = true;

                    if (lastDismissed) {
                        const dismissedAt = new Date(lastDismissed).getTime();
                        const now = new Date().getTime();
                        const intervalMs = (data.popupAd.displayIntervalMinutes || 30) * 60 * 1000;
                        if (now - dismissedAt < intervalMs) {
                            shouldShow = false;
                        }
                    }

                    if (shouldShow) {
                        setPopupAd(data.popupAd);
                        trackEvent(data.popupAd._id, "impression");
                    } else {
                        setPopupAd(null);
                    }
                } else {
                    setPopupAd(null);
                }
            } catch (error) {
                console.error("Error fetching ads", error);
            }
        }

        fetchAds();

        return () => {
            mounted = false;
        };
    }, [pathname, moduleName, getPageName, trackEvent]);

    const handlePopupDismiss = useCallback(() => {
        if (popupAd) {
            localStorage.setItem(`ad_popup_dismissed_${popupAd._id}`, new Date().toISOString());
            setPopupAd(null);
        }
    }, [popupAd]);

    const handleAdClick = useCallback((ad: any) => {
        trackEvent(ad._id, "click");
        setActiveModalAd(ad);
        if (ad.type === "popup" || ad.type === "both") {
             // Also treat click as dismiss for the popup so it doesn't stay behind the modal
             handlePopupDismiss();
        }
    }, [trackEvent, handlePopupDismiss]);

    return (
        <>
            {children}
            
            {cornerAd && (
                <CornerAd 
                    ad={cornerAd} 
                    onClick={() => handleAdClick(cornerAd)} 
                />
            )}
            
            {popupAd && (
                <PopupAd 
                    ad={popupAd} 
                    onDismiss={handlePopupDismiss} 
                    onClick={() => handleAdClick(popupAd)} 
                />
            )}

            <AdModal 
                isOpen={!!activeModalAd}
                onClose={() => setActiveModalAd(null)}
                ad={activeModalAd}
            />
        </>
    );
}
