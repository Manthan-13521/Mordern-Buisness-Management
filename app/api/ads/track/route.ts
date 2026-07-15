import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { Ad } from "@/models/Ad";
import mongoose from "mongoose";
import { requestContext } from "@/lib/requestContext";

// Naive in-memory deduplication cache for serverless environments
// Structure: { "ip-adId-slot-device-event": timestamp }
const trackingCache = new Map<string, number>();

// Clean up cache every 15 minutes to prevent memory leaks
setInterval(() => {
    const now = Date.now();
    for (const [key, timestamp] of trackingCache.entries()) {
        if (now - timestamp > 15 * 60 * 1000) {
            trackingCache.delete(key);
        }
    }
}, 15 * 60 * 1000);

export async function POST(req: Request) {

        const requestId = req ? (req.headers.get("x-request-id") || crypto.randomUUID()) : crypto.randomUUID();
        const clientIp = req ? (req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown") : "unknown";
        const routePath = req ? new URL(req.url).pathname : "unknown";
        const requestMethod = "POST";

        return requestContext.run({
            requestId,
            ip: clientIp,
            route: routePath,
            method: requestMethod,
            startTime: Date.now()
        }, async () => {
            try {
            const body = await req.json();
            const { adId, event, sessionId, slotName, deviceType = "desktop" } = body;

            if (!adId || !event || !["impression", "click", "dismissal"].includes(event)) {
                return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
            }

            if (!mongoose.Types.ObjectId.isValid(adId)) {
                return NextResponse.json({ error: "Invalid Ad ID" }, { status: 400 });
            }

            // IP/Session throttling & deduplication
            // Use sessionId provided by client, fallback to x-forwarded-for IP
            const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown-ip";
            const identifier = sessionId || ip;
            const cacheKey = `${identifier}-${adId}-${slotName || 'global'}-${deviceType}-${event}`;
            const now = Date.now();

            const lastTracked = trackingCache.get(cacheKey);
            if (lastTracked) {
                // Deduplication thresholds:
                // Impressions: once per 5 minutes per user per ad per slot
                // Clicks: once per 1 minute per user per ad per slot
                // Dismissals: once per 10 minutes per user per ad per slot
                const thresholds: Record<string, number> = {
                    impression: 5 * 60 * 1000,
                    click: 60 * 1000,
                    dismissal: 10 * 60 * 1000,
                };

                const threshold = thresholds[event];
                if (now - lastTracked < threshold) {
                    // Ignore duplicate event to prevent impression/click fraud
                    return NextResponse.json({ success: true, duplicated: true });
                }
            }

            // Update cache
            trackingCache.set(cacheKey, now);

            await dbConnect();
            
            // Find the ad to update
            const ad = await Ad.findById(adId);
            if (!ad) {
                return NextResponse.json({ error: "Ad not found" }, { status: 404 });
            }

            // Increment global metrics
            ad[event as "impressions" | "clicks" | "dismissals"] += 1;
            
            // Find or create slot analytics
            let slotIndex = ad.slotAnalytics.findIndex((s: any) => s.slotName === slotName);
            if (slotIndex === -1 && slotName) {
                ad.slotAnalytics.push({
                    slotName: slotName,
                    impressions: 0,
                    clicks: 0,
                    dismissals: 0,
                    ctr: 0,
                    deviceAnalytics: {
                        desktop: { impressions: 0, clicks: 0 },
                        tablet: { impressions: 0, clicks: 0 },
                        mobile: { impressions: 0, clicks: 0 }
                    }
                });
                slotIndex = ad.slotAnalytics.length - 1;
            }

            if (slotIndex !== -1) {
                // Increment slot-specific metrics
                const slotData = ad.slotAnalytics[slotIndex];
                if (event === "impression") slotData.impressions += 1;
                if (event === "click") slotData.clicks += 1;
                if (event === "dismissal") slotData.dismissals += 1;

                // Recalculate slot CTR
                if (slotData.impressions > 0) {
                    slotData.ctr = slotData.clicks / slotData.impressions;
                }

                // Increment device metrics
                const validDevices = ["desktop", "tablet", "mobile"];
                const device = validDevices.includes(deviceType) ? deviceType as "desktop" | "tablet" | "mobile" : "desktop";
                if (event === "impression") slotData.deviceAnalytics[device].impressions += 1;
                if (event === "click") slotData.deviceAnalytics[device].clicks += 1;
            }

            // Save doc
            await ad.save();

            return NextResponse.json({ success: true, cacheKey });
        } catch (error) {
            console.error("POST /api/ads/track error:", error);
            return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
        }
        });
            
}
