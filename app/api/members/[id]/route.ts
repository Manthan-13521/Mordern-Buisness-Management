import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { Member } from "@/models/Member";
import { auditCrossTenantAccess, secureFindById, secureUpdateById, secureDeleteById } from "@/lib/tenantSecurity";
import { resolveUser, AuthUser } from "@/lib/authHelper";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { EntertainmentMember } from "@/models/EntertainmentMember";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/members/[id]
 * Returns a single member with populated plan.
 */
export async function GET(req: Request, props: RouteContext) {
    try {
        await dbConnect();

        const user = await resolveUser(req);
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });

        const { id } = await props.params;

        const populateFields = "name price durationDays durationHours durationMinutes hasTokenPrint quickDelete hasEntertainment hasFaceScan";
        let member = await secureFindById(Member, id, user, { select: "+photoUrl", populate: { path: "planId", select: populateFields } });

        if (!member) {
            member = await secureFindById(EntertainmentMember, id, user, { select: "+photoUrl", populate: { path: "planId", select: populateFields } });
        }

        if (!member) return NextResponse.json({ error: "Not Found" }, {  status: 404 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });

        return NextResponse.json(member, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    } catch (error) {
        console.error("[GET /api/members/[id]]", error);
        return NextResponse.json({ error: "Server error" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}

/**
 * PATCH /api/members/[id]
 * Partial update — used for balance adjustments, plan updates, etc.
 */
export async function PATCH(req: Request, props: RouteContext) {
    try {
        await dbConnect();

        const user = await resolveUser(req);
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });

        const { id } = await props.params;

        const body = await req.json();
        const { isDeleted, deletedAt, memberId, poolId, ...safeUpdates } = body;

        // ── Ownership check: strictly scoped via secure wrapper ──
        let member = await secureUpdateById(Member, id, { $set: safeUpdates }, user, { populate: { path: "planId", select: "name price hasTokenPrint" } });

        if (!member) {
            member = await secureUpdateById(EntertainmentMember, id, { $set: safeUpdates }, user, { populate: { path: "planId", select: "name price hasTokenPrint" } });
        }

        if (!member) return NextResponse.json({ error: "Not Found" }, {  status: 404 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });

        return NextResponse.json(member, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    } catch (error) {
        console.error("[PATCH /api/members/[id]]", error);
        return NextResponse.json({ error: "Server error" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}

/**
 * DELETE /api/members/[id]
 * Soft-delete — marks member as deleted.
 */
export async function DELETE(req: Request, props: RouteContext) {
    try {
        await dbConnect();

        const user = await resolveUser(req);
        if (!user || user.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        const { id } = await props.params;
        if (!id) return NextResponse.json({ error: "Missing member ID" }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });


        
        // 1. Hard Delete
        let deleted = await secureDeleteById(Member, id, user);
        if (!deleted) {
            deleted = await secureDeleteById(EntertainmentMember, id, user);
        }

        if (!deleted) {
            // Log intrusion if existed in another pool
            await auditCrossTenantAccess(Member, id, user);
            await auditCrossTenantAccess(EntertainmentMember, id, user);
            return NextResponse.json({ error: "Not Found" }, {  status: 404 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        return NextResponse.json({ message: "Member deleted successfully." }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    } catch (error) {
        console.error("[DELETE /api/members/[id]]", error);
        return NextResponse.json({ error: "Server error deleting member" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}
