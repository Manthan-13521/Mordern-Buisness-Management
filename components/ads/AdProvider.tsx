"use client";

import { useEffect, useState, useCallback, createContext, useContext } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { AdSlotName } from "@/lib/ad-slots";

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
    const { data: session } = useSession();
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
    
    const getPageName = useCallback(() => {
        if (!pathname) return "dashboard";
        const parts = pathname.split("/").filter(Boolean);
        const lastPart = parts[parts.length - 1];
        if (lastPart === "admin" || lastPart === moduleName) return "dashboard";
        return lastPart;
    }, [pathname, moduleName]);

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
        const page = getPageName();
        let mounted = true;

        async function fetchAds() {
            try {
                const org = (session?.user as any)?.organizationId || "";
                const role = (session?.user as any)?.role || "";
                const city = (session?.user as any)?.city || "";
                const plan = (session?.user as any)?.plan || "";

                const query = new URLSearchParams({
                    module: moduleName,
                    page,
                    org,
                    role,
                    city,
                    plan
                });

                const res = await fetch(`/api/ads/active?${query.toString()}`);
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
    }, [pathname, moduleName, getPageName, session, sessionId]);

    return (
        <AdContext.Provider value={{ slots, trackEvent }}>
            {children}
        </AdContext.Provider>
    );
}
