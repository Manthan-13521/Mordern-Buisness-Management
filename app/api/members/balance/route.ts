import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { Member } from "@/models/Member";
import { getServerSession } from "@/lib/universalAuth";
import { authOptions } from "@/lib/auth";
import { getTenantFilter } from "@/lib/tenant";

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { EntertainmentMember } from "@/models/EntertainmentMember";

/**
 * GET /api/members/balance
 * Returns paginated list of members who have an outstanding balance (balanceAmount > 0).
 * Used in the Balance Payments admin page.
 */
export async function GET(req: Request) {
    try {
        const [, session] = await Promise.all([
            dbConnect(),
            getServerSession(authOptions),
        ]);
        if (!session?.user)
            return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });

        const url = new URL(req.url);
        const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
        const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "20")));
        const memberType = url.searchParams.get("type") || "all";

        // ── Tenant isolation guard ───────────────────────────────────────────
        if (session.user.role !== "superadmin" && !session.user.poolId) {
            return NextResponse.json({ error: "No pool assigned to this account" }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }
        const tenantFilter = getTenantFilter(session.user);

        const query: Record<string, unknown> = {
            balanceAmount: { $gt: 0 },
            isDeleted: false,
            ...tenantFilter,
        };

        if (memberType === "member") {
            query.memberId = { $regex: /^M(?!S)/i };
        } else if (memberType === "entertainment") {
            query.memberId = { $regex: /^MS/i };
        }

        const selectFields = "memberId name phone planId planQuantity paidAmount balanceAmount paymentStatus createdAt photoUrl";
        
        let regularMembers: any[] = [];
        let entertainmentMembers: any[] = [];
        
        if (memberType === "all" || memberType === "member") {
            regularMembers = await Member.find(query).populate("planId", "name price").select(selectFields).lean() as any[];
        }
        
        if (memberType === "all" || memberType === "entertainment") {
            entertainmentMembers = await EntertainmentMember.find(query).populate("planId", "name price").select(selectFields).lean() as any[];
        }

        const taggedEntertainment = entertainmentMembers.map((m: any) => ({ ...m, _source: "entertainment" }));
        const allMembers = [...regularMembers, ...taggedEntertainment]
            .sort((a, b) => {
                const diff = (b.balanceAmount || 0) - (a.balanceAmount || 0);
                if (diff !== 0) return diff;
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });

        const total = allMembers.length;
        const totalPages = Math.ceil(total / limit);
        const paginatedData = allMembers.slice((page - 1) * limit, page * limit);
        const totalBalance = allMembers.reduce((sum, m) => sum + (m.balanceAmount || 0), 0);

        return NextResponse.json({
            data: paginatedData,
            total,
            page,
            limit,
            totalPages,
            totalBalance,
        }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    } catch (error) {
        console.error("[GET /api/members/balance]", error);
        return NextResponse.json({ error: "Failed to fetch balance members" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}
