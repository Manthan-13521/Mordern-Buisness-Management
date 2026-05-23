import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { Ad } from "@/models/Ad";
import mongoose from "mongoose";

// Naive in-memory deduplication cache for serverless environments
// Structure: { "ip-adId-event": timestamp }
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
    try {
        const body = await req.json();
        const { adId, event, sessionId } = body;

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
        const cacheKey = `${identifier}-${adId}-${event}`;
        const now = Date.now();

        const lastTracked = trackingCache.get(cacheKey);
        if (lastTracked) {
            // Deduplication thresholds:
            // Impressions: once per 5 minutes per user per ad
            // Clicks: once per 1 minute per user per ad
            // Dismissals: once per 10 minutes per user per ad
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

        // Use atomic $inc to prevent race conditions during high concurrency
        let update = {};
        if (event === "impression") update = { $inc: { impressions: 1 } };
        else if (event === "click") update = { $inc: { clicks: 1 } };
        else if (event === "dismissal") update = { $inc: { dismissals: 1 } };
        
        await Ad.updateOne({ _id: adId }, update);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("POST /api/ads/track error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
