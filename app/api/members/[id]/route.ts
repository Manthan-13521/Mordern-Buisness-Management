import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { Member } from "@/models/Member";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { auditCrossTenantAccess, secureFindById, secureUpdateById } from "@/lib/tenantSecurity";

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { EntertainmentMember } from "@/models/EntertainmentMember";
import { invalidateCache } from "@/lib/membersCache";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/members/[id]
 * Returns a single member with populated plan.
 */
export async function GET(_req: Request, props: RouteContext) {
    try {
        await dbConnect();

        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id } = await props.params;

        const populateFields = "name price durationDays durationHours durationMinutes hasTokenPrint quickDelete hasEntertainment hasFaceScan";
        let member = await secureFindById(Member, id, session.user, { select: "+photoUrl", populate: { path: "planId", select: populateFields } });

        if (!member) {
            member = await secureFindById(EntertainmentMember, id, session.user, { select: "+photoUrl", populate: { path: "planId", select: populateFields } });
        }

        if (!member) return NextResponse.json({ error: "Not Found" }, { status: 404 });

        return NextResponse.json(member, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    } catch (error) {
        console.error("[GET /api/members/[id]]", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

/**
 * PATCH /api/members/[id]
 * Partial update — used for balance adjustments, plan updates, etc.
 */
export async function PATCH(req: Request, props: RouteContext) {
    try {
        await dbConnect();

        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id } = await props.params;

        const body = await req.json();
        const { isDeleted, deletedAt, memberId, poolId, ...safeUpdates } = body;

        // ── Ownership check: strictly scoped via secure wrapper ──
        let member = await secureUpdateById(Member, id, { $set: safeUpdates }, session.user, { populate: { path: "planId", select: "name price hasTokenPrint" } });

        if (!member) {
            member = await secureUpdateById(EntertainmentMember, id, { $set: safeUpdates }, session.user, { populate: { path: "planId", select: "name price hasTokenPrint" } });
        }

        if (!member) return NextResponse.json({ error: "Not Found" }, { status: 404 });

        // Invalidate members list cache
        invalidateCache(member.poolId).catch(() => {});

        return NextResponse.json(member, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    } catch (error) {
        console.error("[PATCH /api/members/[id]]", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

/**
 * DELETE /api/members/[id]
 * Soft-delete — marks member as deleted.
 */
export async function DELETE(req: Request, props: RouteContext) {
    try {
        await dbConnect();

        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await props.params;
        if (!id) return NextResponse.json({ error: "Missing member ID" }, { status: 400 });

        const updates = {
            isDeleted:    true,
            deletedAt:    new Date(),
            deletedBy:    session.user.id,
            deleteReason: "manual",
            isActive:     false,
            status:       "deleted"
        };
        
        // 1. Soft Delete
        let updated = await secureUpdateById(Member, id, { $set: updates }, session.user);
        if (!updated) {
            updated = await secureUpdateById(EntertainmentMember, id, { $set: updates }, session.user);
        }

        if (!updated) {
            // Log intrusion if existed in another pool
            await auditCrossTenantAccess(Member, id, session.user);
            await auditCrossTenantAccess(EntertainmentMember, id, session.user);
            return NextResponse.json({ error: "Not Found" }, { status: 404 });
        }

        // 2. Cache Invalidation
        invalidateCache(updated.poolId).catch(() => {});

        return NextResponse.json({ message: "Member moved to recycle bin successfully." }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    } catch (error) {
        console.error("[DELETE /api/members/[id]]", error);
        return NextResponse.json({ error: "Server error deleting member" }, { status: 500 });
    }
}
