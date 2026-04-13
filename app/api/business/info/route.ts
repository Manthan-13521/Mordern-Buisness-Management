import { NextResponse } from "next/server";
import { resolveUser, AuthUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";
import { Business } from "@/models/Business";

export const dynamic = "force-dynamic";

// GET /api/business/info — returns name, address, phone for the current logged-in business
export async function GET(req: Request) {
    try {
        const user = await resolveUser(req);
        if (!user || user.role !== "business_admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();
        const businessId = user.businessId;

        const business = await Business.findOne({ businessId }).lean() as any;
        if (!business) {
            return NextResponse.json({ error: "Business not found" }, { status: 404 });
        }

        return NextResponse.json({
            name: business.name || "",
            address: business.address || "",
            phone: business.phone || "",
            logoUrl: business.logoUrl || "",
            slug: business.slug || "",
        }, {
            headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" }
        });
    } catch (error) {
        console.error("[GET /api/business/info]", error);
        return NextResponse.json({ error: "Failed to fetch business info" }, { status: 500 });
    }
}
