import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { Member } from "@/models/Member";
import { EntertainmentMember } from "@/models/EntertainmentMember";
import { secureFindById } from "@/lib/tenantSecurity";
import { invalidateCache } from "@/lib/membersCache";
import { deleteS3Object } from "@/lib/s3";
import { resolveUser, AuthUser } from "@/lib/authHelper";
type RouteContext = { params: Promise<{ id: string }> };

/**
 * DELETE /api/members/[id]/permanent
 * Hard-delete — permanently removes a member from the database and cleans up S3 photos if unused.
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

        let member: any = await secureFindById(Member, id, user);
        let Model: any = Member;
        
        if (!member) {
            member = await secureFindById(EntertainmentMember, id, user);
            Model = EntertainmentMember;
        }

        if (!member) {
            return NextResponse.json({ error: "Not Found or Unauthorized" }, {  status: 404 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        // Cleanup S3 photo if present and not used by anyone else
        if (member.photoUrl) {
            const mCount = await Member.countDocuments({ photoUrl: member.photoUrl, _id: { $ne: member._id } });
            const eCount = await EntertainmentMember.countDocuments({ photoUrl: member.photoUrl, _id: { $ne: member._id } });
            if (mCount === 0 && eCount === 0) {
                await deleteS3Object(member.photoUrl);
            }
        }

        // Permanent explicit delete
        await Model.deleteOne({ _id: member._id });

        // Cache Invalidation
        invalidateCache(member.poolId).catch(() => {});

        return NextResponse.json({ message: "Member permanently deleted." }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    } catch (error) {
        console.error("[DELETE /api/members/[id]/permanent]", error);
        return NextResponse.json({ error: "Server error deleting member" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}
