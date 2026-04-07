import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { Member } from "@/models/Member";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { secureUpdateById } from "@/lib/tenantSecurity";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/members/[id]/restore
 * Restores a soft-deleted or expired member back to active status.
 * Optionally accepts a new planEndDate in the body.
 */
export async function POST(req: Request, props: RouteContext) {
    try {
        await dbConnect();

        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== "admin") {
            return NextResponse.json({ error: "Admin only" }, { status: 403 });
        }

        const { id } = await props.params;

        // Optionally accept a new planEndDate for renewal-on-restore
        let body: { planEndDate?: string } = {};
        try { body = await req.json(); } catch { /* no body — ok */ }

        const updates: Record<string, unknown> = {
            isDeleted:    false,
            isExpired:    false,
            isActive:     true,
            status:       "active",
            deletedAt:    null,
            deletedAtLegacy: null,
            deleteReason: null,
            expiredAt:    null,
        };

        if (body.planEndDate) {
            updates.planEndDate = new Date(body.planEndDate);
            updates.expiryDate  = new Date(body.planEndDate);
        }

        const member = await secureUpdateById(Member, id, { $set: updates }, session.user, { populate: { path: "planId", select: "name price hasTokenPrint" } });

        if (!member) return NextResponse.json({ error: "Not Found" }, { status: 404 });

        return NextResponse.json({ message: "Member restored successfully.", member });
    } catch (error) {
        console.error("[POST /api/members/[id]/restore]", error);
        return NextResponse.json({ error: "Server error restoring member" }, { status: 500 });
    }
}
