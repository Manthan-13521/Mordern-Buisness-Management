"use client";

import { useEffect, useState, useCallback, createContext, useContext } from "react";
import { usePathname } from "next/navigation";
import { AdSlotName } from "@/lib/ad-slots";
import { PopupAd } from "./PopupAd";

type DeviceType = "mobile" | "tablet" | "desktop";

function getDeviceType(): DeviceType {
    const width = window.innerWidth;
    if (width < 768) return "mobile";
    if (width < 1024) return "tablet";
    return "desktop";
}

function generateId(): string {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

interface AdContextType {
    slots: Record<string, any | any[]>;
    trackEvent: (adId: string, event: "impression" | "click" | "dismissal", slotName?: string) => void;
}

const AdContext = createContext<AdContextType>({
    slots: {},
    trackEvent: () => {},
});

export function useAdSlot(slotName: AdSlotName) {
    const context = useContext(AdContext);
    return context.slots[slotName] || null;
}

export function useAdTrack() {
    const context = useContext(AdContext);
    return context.trackEvent;
}

export function AdProvider({ children, moduleName }: { children: React.ReactNode; moduleName: string }) {
    const pathname = usePathname();
    const [slots, setSlots] = useState<Record<string, any | any[]>>({});
    const [sessionId, setSessionId] = useState<string>("");

    useEffect(() => {
        let sid = localStorage.getItem("ad_session_id");
        if (!sid) {
            sid = generateId();
            localStorage.setItem("ad_session_id", sid);
        }
        setSessionId(sid);
    }, []);
    
    const trackEvent = useCallback(async (adId: string, event: "impression" | "click" | "dismissal", slotName?: string) => {
        try {
            if (!sessionId) return;
            const deviceType = getDeviceType();
            const track = () => {
                fetch("/api/ads/track", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ adId, event, sessionId, slotName, deviceType }),
                }).catch(() => {});
            };
            if ("requestIdleCallback" in window) {
                (window as any).requestIdleCallback(track);
            } else {
                setTimeout(track, 100);
            }
        } catch (e) {}
    }, [sessionId]);

    useEffect(() => {
        let mounted = true;

        async function fetchAds() {
            try {
                const res = await fetch("/api/ads/active");
                if (!res.ok) return;
                const data = await res.json();
                
                if (!mounted) return;

                const filteredSlots: Record<string, any> = {};
                for (const [slotName, slotData] of Object.entries(data.slots || {})) {
                    if (Array.isArray(slotData)) {
                        filteredSlots[slotName] = slotData.filter(ad => {
                            const views = parseInt(localStorage.getItem(`ad_views_${ad._id}`) || "0");
                            if (ad.frequencyCap > 0 && views >= ad.frequencyCap) return false;
                            const lastDismissed = localStorage.getItem(`ad_popup_dismissed_${ad._id}`);
                            if (lastDismissed) {
                                const dismissedAt = new Date(lastDismissed).getTime();
                                const intervalMs = (ad.displayIntervalMinutes || 30) * 60 * 1000;
                                if (Date.now() - dismissedAt < intervalMs) return false;
                            }
                            return true;
                        });
                    } else {
                        const ad = slotData as any;
                        const views = parseInt(localStorage.getItem(`ad_views_${ad._id}`) || "0");
                        if (ad.frequencyCap > 0 && views >= ad.frequencyCap) continue;
                        filteredSlots[slotName] = ad;
                    }
                }

                setSlots(filteredSlots);
            } catch (error) {
                console.error("Error fetching ads", error);
            }
        }

        if (sessionId) {
            fetchAds();
        }

        return () => {
            mounted = false;
        };
    }, [pathname, sessionId]);

    const popupAds = slots["popup"];
    
    return (
        <AdContext.Provider value={{ slots, trackEvent }}>
            {children}
            {popupAds && (Array.isArray(popupAds) ? popupAds.length > 0 : true) && (
                <PopupAd
                    ads={Array.isArray(popupAds) ? popupAds : [popupAds]}
                    onDismiss={() => {
                        const adsToDismiss = Array.isArray(popupAds) ? popupAds : [popupAds];
                        adsToDismiss.forEach((ad: any) => {
                            localStorage.setItem(`ad_popup_dismissed_${ad._id}`, new Date().toISOString());
                            trackEvent(ad._id, "dismissal", "popup");
                        });
                    }}
                    onAdDismiss={(adId) => {
                        localStorage.setItem(`ad_popup_dismissed_${adId}`, new Date().toISOString());
                        trackEvent(adId, "dismissal", "popup");
                    }}
                    onClick={(ad) => {
                        trackEvent(ad._id, "click", "popup");
                        if (ad.targetUrl) {
                            let url = ad.targetUrl;
                            if (!/^https?:\/\//i.test(url) && !url.startsWith('/')) url = 'https://' + url;
                            window.open(url, "_blank", "noopener,noreferrer");
                        }
                    }}
                    onImpression={(adId) => {
                        trackEvent(adId, "impression", "popup");
                        const views = parseInt(localStorage.getItem(`ad_views_${adId}`) || "0");
                        localStorage.setItem(`ad_views_${adId}`, (views + 1).toString());
                    }}
                />
            )}
        </AdContext.Provider>
    );
}
