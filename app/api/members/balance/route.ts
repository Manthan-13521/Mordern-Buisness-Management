import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { Member } from "@/models/Member";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

import { EntertainmentMember } from "@/models/EntertainmentMember";

/**
 * GET /api/members/balance
 * Returns paginated list of members who have an outstanding balance (balanceAmount > 0).
 * Used in the Balance Payments admin page.
 */
export async function GET(req: Request) {
    try {
        await dbConnect();

        const session = await getServerSession(authOptions);
        if (!session?.user)
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const url = new URL(req.url);
        const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
        const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "20")));

        const query: Record<string, unknown> = {
            balanceAmount: { $gt: 0 },
            isDeleted: false,
        };

        if (session.user.role !== "superadmin" && session.user.poolId) {
            query.poolId = session.user.poolId;
        }

        const [regularMembers, entertainmentMembers] = await Promise.all([
            Member.find(query).populate("planId", "name price").lean() as any,
            EntertainmentMember.find(query).populate("planId", "name price").lean() as any,
        ]);

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

        return NextResponse.json({
            data: paginatedData,
            total,
            page,
            limit,
            totalPages,
        });
    } catch (error) {
        console.error("[GET /api/members/balance]", error);
        return NextResponse.json(
            { error: "Failed to fetch balance members" },
            { status: 500 }
        );
    }
}
