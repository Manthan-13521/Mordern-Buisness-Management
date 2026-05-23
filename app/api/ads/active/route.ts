import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { Ad, IAd } from "@/models/Ad";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const module = searchParams.get("module");
        const page = searchParams.get("page");

        if (!module || !page) {
            return NextResponse.json({ error: "Missing module or page" }, { status: 400 });
        }

        await dbConnect();

        const now = new Date();

        // Find active ads for the target module and page
        const activeAds = await Ad.find({
            isActive: true,
            startDate: { $lte: now },
            endDate: { $gte: now },
            targetModules: module,
            targetPages: page,
        }).lean<IAd[]>();

        if (!activeAds || activeAds.length === 0) {
            return NextResponse.json({ cornerAd: null, popupAds: [] });
        }

        // Group ads by type (corner, popup, both)
        let cornerAds = activeAds.filter(ad => ad.type === "corner" || ad.type === "both");
        let popupAds = activeAds.filter(ad => ad.type === "popup" || ad.type === "both");

        // Helper to pick top priority or random top priority
        const pickTopAd = (ads: IAd[]) => {
            if (ads.length === 0) return null;
            // Sort descending by priority
            ads.sort((a, b) => b.priority - a.priority);
            const highestPriority = ads[0].priority;
            // Get all ads with the highest priority
            const topTierAds = ads.filter(ad => ad.priority === highestPriority);
            // Randomly pick one if there's a tie
            return topTierAds[Math.floor(Math.random() * topTierAds.length)];
        };

        const topCornerAd = pickTopAd(cornerAds);
        const sortedPopupAds = popupAds.sort((a, b) => b.priority - a.priority);

        return NextResponse.json({
            cornerAd: topCornerAd,
            popupAds: sortedPopupAds,
        }, {
            headers: {
                "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120"
            }
        });
    } catch (error) {
        console.error("GET /api/ads/active error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
