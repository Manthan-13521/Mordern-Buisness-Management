import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { Ad } from "@/models/Ad";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SLOT_CONFIGS, AdSlotName } from "@/lib/ad-slots";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "superadmin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();
        const ads = await Ad.find().sort({ createdAt: -1 }).lean();
        return NextResponse.json(ads);
    } catch (error) {
        console.error("GET /api/superadmin/ads error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "superadmin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();

        if (
            !body.title ||
            !body.imageUrl ||
            !body.startDate ||
            !body.endDate ||
            !Array.isArray(body.placementSlots) ||
            body.placementSlots.length === 0
        ) {
            return NextResponse.json(
                { error: "Missing required fields (title, imageUrl, startDate, endDate, placementSlots)" },
                { status: 400 }
            );
        }

        const selectedSlots: AdSlotName[] = body.placementSlots;
        const seenGroups = new Map<string, string>();
        for (const slot of selectedSlots) {
            const config = SLOT_CONFIGS[slot];
            if (!config) {
                return NextResponse.json(
                    { error: `Invalid slot: ${slot}` },
                    { status: 400 }
                );
            }
            for (const group of config.conflictGroups) {
                const existing = seenGroups.get(group);
                if (existing) {
                    return NextResponse.json(
                        { error: `Slot conflict: "${slot}" and "${existing}" share conflict group "${group}"` },
                        { status: 400 }
                    );
                }
                seenGroups.set(group, slot);
            }
        }

        if (!body.type) body.type = "native";
        if (!body.status) body.status = "active";
        if (!body.deliveryStrategy) body.deliveryStrategy = "single";
        if (!body.slotAnalytics) body.slotAnalytics = [];
        if (!body.targetModules) body.targetModules = [];
        if (!body.targetPages) body.targetPages = [];
        if (!body.targetOrganizations) body.targetOrganizations = [];
        if (!body.targetPlans) body.targetPlans = [];
        if (!body.targetCities) body.targetCities = [];
        if (!body.targetRoles) body.targetRoles = [];

        await dbConnect();

        const newAd = new Ad({
            ...body,
            createdBy: session.user.id,
        });

        await newAd.save();
        return NextResponse.json(newAd, { status: 201 });
    } catch (error) {
        console.error("POST /api/superadmin/ads error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
