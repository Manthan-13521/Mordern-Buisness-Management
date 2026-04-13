import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { Member } from "@/models/Member";
import { EntertainmentMember } from "@/models/EntertainmentMember";
import { resolveUser, AuthUser } from "@/lib/authHelper";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/members/lookup?uid=M0001
 * Searches both Member and EntertainmentMember collections by memberId.
 * Returns the member details with populated plan info.
 */
export async function GET(req: NextRequest) {
    try {
        await dbConnect();

                const user = await resolveUser(req);
                await dbConnect();
        if (!user)
            return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });

        const uid = req.nextUrl.searchParams.get("uid")?.trim();
        if (!uid)
            return NextResponse.json({ error: "uid query parameter required" }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });

        const poolId = user.role !== "superadmin" ? (user.poolId || "UNASSIGNED_POOL") : undefined;
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
            return NextResponse.json({ error: "Member not found" }, {  status: 404 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        return NextResponse.json({ ...member, _source: source }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    } catch (error) {
        console.error("[GET /api/members/lookup]", error);
        return NextResponse.json({ error: "Server error" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}
