import { NextResponse } from "next/server";
import { resolveUser, AuthUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";
import { Business } from "@/models/Business";
import { requireBusinessId } from "@/lib/tenant";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

// GET /api/business/info — returns name, address, phone for the current logged-in business
export async function GET(req: Request) {
    try {
        const user = await resolveUser(req);
        if (!user || user.role !== "business_admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        let businessId: string;
        try {
            businessId = requireBusinessId(user);
        } catch (err: any) {
            return NextResponse.json({ error: err.message }, { status: err.message === "Unauthorized" ? 401 : 403 });
        }

        await dbConnect();

        // 🔴 TERMINAL DEFENSE
        if (!businessId) {
            throw new Error("Tenant context lost before query execution");
        }

        const business = await Business.findOne({ businessId }).lean() as any;
        if (!business) {
            return NextResponse.json({ error: "Business not found" }, { status: 404 });
        }

        return NextResponse.json({
            name: business.name || "",
            address: business.address || "",
            phone: business.phone || "",
            gstNumber: business.gstNumber || "",
            logoUrl: business.logoUrl || "",
            slug: business.slug || "",
        }, {
            headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" }
        });
    } catch (error: any) {
        logger.error("Business info fetch error", { error: error?.message });
        return NextResponse.json({ error: "Failed to fetch business info" }, { status: 500 });
    }
}
