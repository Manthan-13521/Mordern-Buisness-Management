import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { Ad, IAd } from "@/models/Ad";
import { AD_SLOT_LIST } from "@/lib/ad-slots";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const module = searchParams.get("module");
        const page = searchParams.get("page");
        
        // Advanced targeting params
        const org = searchParams.get("org")?.toLowerCase() || "";
        const city = searchParams.get("city")?.toLowerCase() || "";
        const role = searchParams.get("role")?.toLowerCase() || "";
        const plan = searchParams.get("plan")?.toLowerCase() || "";

        if (!module || !page) {
            return NextResponse.json({ error: "Missing module or page" }, { status: 400 });
        }

        await dbConnect();

        const now = new Date();

        // 1. Fetch ALL active ads for this module/page combination
        const activeAds = await Ad.find({
            isActive: true,
            startDate: { $lte: now },
            endDate: { $gte: now },
            targetModules: module,
            targetPages: page,
        }).lean<IAd[]>();

        if (!activeAds || activeAds.length === 0) {
            return NextResponse.json({ slots: {} });
        }

        // 2. Score and filter ads based on targeting match
        const scoredAds = activeAds.map(ad => {
            let score = ad.priority * 10; // Base score from manual priority
            let isGlobal = true;
            let targetingMatch = true;

            // Helper to check 'includes' logic
            const checkTarget = (targetArray: string[], userValue: string) => {
                if (!targetArray || targetArray.length === 0) return true; // Global for this criteria
                isGlobal = false;
                if (!userValue) return false; // Ad requires target, user has none
                return targetArray.some(t => userValue.includes(t.toLowerCase()));
            };

            const orgMatch = checkTarget(ad.targetOrganizations, org);
            const cityMatch = checkTarget(ad.targetCities, city);
            const roleMatch = checkTarget(ad.targetRoles, role);
            const planMatch = checkTarget(ad.targetPlans, plan);

            targetingMatch = orgMatch && cityMatch && roleMatch && planMatch;

            if (targetingMatch) {
                if (!isGlobal) score += 50; // Targeted ads get a huge boost over global ads
                
                // Add CTR to score (impressions > 0)
                if (ad.impressions > 100) {
                    const ctr = ad.clicks / ad.impressions;
                    score += ctr * 20; // High CTR boosts score
                }

                // Add recency to score (newer campaigns get slight boost)
                const daysOld = (now.getTime() - new Date(ad.createdAt).getTime()) / (1000 * 3600 * 24);
                if (daysOld < 7) score += 5; 
            }

            return { ...ad, score, targetingMatch };
        }).filter(ad => ad.targetingMatch); // Keep only ads where targeting matched

        // 3. Group by Slot
        const slotsMap: Record<string, any[]> = {};
        
        for (const ad of scoredAds) {
            const slot = ad.placementSlot || ad.type; // Fallback to type for older ads
            if (!slotsMap[slot]) slotsMap[slot] = [];
            slotsMap[slot].push(ad);
        }

        // 4. Resolve the best ad(s) for each slot
        const resolvedSlots: Record<string, any | any[]> = {};

        for (const slot of Object.keys(slotsMap)) {
            // Sort by score descending
            const adsInSlot = slotsMap[slot].sort((a, b) => b.score - a.score);
            
            if (slot === "carousel" || slot === "popup") {
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
