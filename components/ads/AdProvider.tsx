"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { CornerAd } from "./CornerAd";
import { PopupAd } from "./PopupAd";
import { AdModal } from "./AdModal";

export function AdProvider({ children, moduleName }: { children: React.ReactNode; moduleName: string }) {
    const pathname = usePathname();
    const [cornerAd, setCornerAd] = useState<any>(null);
    const [popupAds, setPopupAds] = useState<any[]>([]);
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

                if (data.popupAds && data.popupAds.length > 0) {
                    const now = new Date().getTime();
                    const validAds = data.popupAds.filter((ad: any) => {
                        const cooldownKey = `ad_popup_dismissed_${ad._id}`;
                        const lastDismissed = localStorage.getItem(cooldownKey);
                        if (lastDismissed) {
                            const dismissedAt = new Date(lastDismissed).getTime();
                            const intervalMs = (ad.displayIntervalMinutes || 30) * 60 * 1000;
                            if (now - dismissedAt < intervalMs) {
                                return false;
                            }
                        }
                        return true;
                    });

                    if (validAds.length > 0) {
                        setPopupAds(validAds);
                        // Track impression for the first ad initially. The PopupAd component will handle subsequent impressions if there are multiple.
                        trackEvent(validAds[0]._id, "impression");
                    } else {
                        setPopupAds([]);
                    }
                } else {
                    setPopupAds([]);
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

    const handlePopupDismiss = useCallback((adId?: string) => {
        if (!adId) {
            // Dismiss all currently shown ads if no ID provided (e.g., closing the modal)
            popupAds.forEach(ad => {
                localStorage.setItem(`ad_popup_dismissed_${ad._id}`, new Date().toISOString());
            });
            setPopupAds([]);
        } else {
            localStorage.setItem(`ad_popup_dismissed_${adId}`, new Date().toISOString());
            setPopupAds(prev => prev.filter(a => a._id !== adId));
        }
    }, [popupAds]);

    const handleAdClick = useCallback((ad: any) => {
        trackEvent(ad._id, "click");
        setActiveModalAd(ad);
        if (ad.type === "popup" || ad.type === "both") {
             // Treat click as dismiss for this specific ad
             handlePopupDismiss(ad._id);
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
            
            {popupAds.length > 0 && (
                <PopupAd 
                    ads={popupAds} 
                    onDismiss={() => handlePopupDismiss()} 
                    onAdDismiss={(adId) => handlePopupDismiss(adId)}
                    onClick={handleAdClick}
                    onImpression={(adId) => trackEvent(adId, "impression")}
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
