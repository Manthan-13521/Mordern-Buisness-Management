import { NextResponse } from "next/server";
import { resolveUser, AuthUser } from "@/lib/authHelper";
import { requireBusinessId } from "@/lib/tenant";
import { logger } from "@/lib/logger";
import {
    getBusinessProfile,
    updateBusinessProfile,
    validateBusinessUpdate,
    sanitizeBusinessInput,
} from "@/lib/services/businessProfileService";

export const dynamic = "force-dynamic";

// GET /api/business/info — returns business profile for the current logged-in business
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

        // 🔴 TERMINAL DEFENSE
        if (!businessId) {
            throw new Error("Tenant context lost before query execution");
        }

        const profile = await getBusinessProfile(businessId);
        if (!profile) {
            return NextResponse.json({ error: "Business not found" }, { status: 404 });
        }

        return NextResponse.json({
            name: profile.name,
            address: profile.address,
            phone: profile.phone,
            gstNumber: profile.gstNumber,
            logoUrl: profile.logoUrl,
            slug: profile.slug,
        }, {
            headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" }
        });
    } catch (error: any) {
        logger.error("Business info fetch error", { error: error?.message });
        return NextResponse.json({ error: "Failed to fetch business info" }, { status: 500 });
    }
}

// PUT /api/business/info — update business profile (name, address, phone, gstNumber)
export async function PUT(req: Request) {
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

        if (!businessId) {
            throw new Error("Tenant context lost before query execution");
        }

        const body = await req.json();

        // Only allow specific fields — ignore everything else
        const input = {
            name: body.name !== undefined ? String(body.name) : undefined,
            address: body.address !== undefined ? String(body.address) : undefined,
            phone: body.phone !== undefined ? String(body.phone) : undefined,
            gstNumber: body.gstNumber !== undefined ? String(body.gstNumber) : undefined,
        };

        // Sanitize
        const sanitized = sanitizeBusinessInput(input);

        // Validate
        const validation = validateBusinessUpdate(sanitized);
        if (!validation.valid) {
            return NextResponse.json(
                { error: "Validation failed", details: validation.errors },
                { status: 400 }
            );
        }

        // Update with audit trail
        const updatedBy = (user as any).email || (user as any)._id?.toString() || "unknown";
        const { profile, auditEntries } = await updateBusinessProfile(businessId, sanitized, updatedBy);

        return NextResponse.json({
            success: true,
            name: profile.name,
            address: profile.address,
            phone: profile.phone,
            gstNumber: profile.gstNumber,
            logoUrl: profile.logoUrl,
            slug: profile.slug,
            changesApplied: auditEntries.length,
        }, {
            headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" }
        });
    } catch (error: any) {
        logger.error("Business info update error", { error: error?.message });
        const status = error?.message?.includes("Validation failed") ? 400
            : error?.message === "Business not found" ? 404
            : 500;
        return NextResponse.json({ error: error?.message || "Failed to update business info" }, { status });
    }
}
