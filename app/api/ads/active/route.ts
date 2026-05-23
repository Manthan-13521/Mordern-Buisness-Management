import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { Ad } from "@/models/Ad";

export async function GET(req: Request) {
    try {
        await dbConnect();

        const now = new Date();

        // 1. Fetch ALL active ads
        // Note: Legacy ads without status fallback to isActive in migration, but here we query by status.
        // Also support older ads using an $or for backward compatibility if migration hasn't run.
        const activeAds = await Ad.find({
            $or: [{ status: "active" }, { isActive: true }],
            startDate: { $lte: now },
            endDate: { $gte: now },
        }).lean<any[]>();

        if (!activeAds || activeAds.length === 0) {
            return NextResponse.json({ slots: {} });
        }

        // 2. Score ads based on priority, performance (CTR) and recency
        const scoredAds = activeAds.map(ad => {
            let score = (ad.priority || 0) * 10; // Base score from manual priority

            // Add CTR to score (impressions > 100)
            if (ad.impressions > 100) {
                const ctr = ad.clicks / ad.impressions;
                score += ctr * 20; // High CTR boosts score
            }

            // Add recency to score (newer campaigns get slight boost)
            const daysOld = (now.getTime() - new Date(ad.createdAt).getTime()) / (1000 * 3600 * 24);
            if (daysOld < 7) score += 5;

            return { ...ad, score };
        });

        // 3. Group by Slot
        const slotsMap: Record<string, any[]> = {};
        
        for (const ad of scoredAds) {
            const slots = ad.placementSlots && ad.placementSlots.length > 0 
                ? ad.placementSlots 
                : (ad.placementSlot ? [ad.placementSlot] : [ad.type]); // Fallback for old ads
            
            for (const slot of slots) {
                if (!slotsMap[slot]) slotsMap[slot] = [];
                slotsMap[slot].push(ad);
            }
        }

        // 4. Resolve the best ad(s) for each slot based on delivery strategy
        const resolvedSlots: Record<string, any | any[]> = {};

        for (const slot of Object.keys(slotsMap)) {
            // Sort by score descending
            const adsInSlot = slotsMap[slot].sort((a, b) => b.score - a.score);
            
            // Provide multiple ads if the slot or strategy supports it
            const hasMultipleStrategy = adsInSlot.some(a => ["rotate", "weighted", "sequential"].includes(a.deliveryStrategy));

            if (slot === "carousel" || slot === "popup" || hasMultipleStrategy) {
                // Return array for slots that support multiple rotating ads
                resolvedSlots[slot] = adsInSlot;
            } else {
                // Return the single highest-scoring ad for fixed slots
                resolvedSlots[slot] = adsInSlot[0];
            }
        }

        return NextResponse.json({
            slots: resolvedSlots,
        }, {
            headers: {
                "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" // Shorter cache for dynamic rotation
            }
        });
    } catch (error) {
        console.error("GET /api/ads/active error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
