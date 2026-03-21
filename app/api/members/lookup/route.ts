import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { Member } from "@/models/Member";
import { EntertainmentMember } from "@/models/EntertainmentMember";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * GET /api/members/lookup?uid=M0001
 * Searches both Member and EntertainmentMember collections by memberId.
 * Returns the member details with populated plan info.
 */
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user)
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const uid = req.nextUrl.searchParams.get("uid")?.trim();
        if (!uid)
            return NextResponse.json({ error: "uid query parameter required" }, { status: 400 });

        await dbConnect();

        const poolId = session.user.role !== "superadmin" ? session.user.poolId : undefined;
        const query: Record<string, unknown> = { memberId: { $regex: `^${uid}$`, $options: "i" } };
        if (poolId) query.poolId = poolId;

        const populateFields = "name price durationDays durationHours durationMinutes durationSeconds hasTokenPrint quickDelete hasEntertainment";

        // Try regular member first
        let member: any = await Member.findOne(query).populate("planId", populateFields).lean();
        let source = "member";

        // Try entertainment member if not found
        if (!member) {
            member = await EntertainmentMember.findOne(query).populate("planId", populateFields).lean();
            source = "entertainment";
        }

        if (!member) {
            return NextResponse.json({ error: "Member not found" }, { status: 404 });
        }

        return NextResponse.json({ ...member, _source: source });
    } catch (error) {
        console.error("[GET /api/members/lookup]", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
