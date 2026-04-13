import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { Member } from "@/models/Member";
import { EntertainmentMember } from "@/models/EntertainmentMember";
import { getServerSession } from "@/lib/universalAuth";
import { authOptions } from "@/lib/auth";
import { auditCrossTenantAccess, secureUpdateById } from "@/lib/tenantSecurity";
import { getTenantFilter } from "@/lib/tenant";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/members/[id]/equipment
 * Issues a new equipment item to the member.
 * Body: { itemName: string }
 */
export async function POST(req: Request, props: RouteContext) {
    try {
        await dbConnect();

        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });

        const { id } = await props.params;
        const { itemName } = await req.json();

        if (!itemName?.trim()) {
            return NextResponse.json({ error: "itemName is required" }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        let member = await secureUpdateById(Member, id, {
            $push: {
                equipmentTaken: {
                    itemName:    itemName.trim(),
                    issuedDate:  new Date(),
                    isReturned:  false,
                },
            },
        }, session.user, { select: "memberId name equipmentTaken" });

        if (!member) {
            member = await secureUpdateById(EntertainmentMember, id, {
                $push: {
                    equipmentTaken: {
                        itemName:    itemName.trim(),
                        issuedDate:  new Date(),
                        isReturned:  false,
                    },
                },
            }, session.user, { select: "memberId name equipmentTaken" });
        }

        if (!member) return NextResponse.json({ error: "Not Found" }, {  status: 404 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });

        return NextResponse.json({ message: "Equipment issued.", equipmentTaken: member.equipmentTaken }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    } catch (error) {
        console.error("[POST /api/members/[id]/equipment]", error);
        return NextResponse.json({ error: "Server error issuing equipment" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}

/**
 * PATCH /api/members/[id]/equipment
 * Marks an equipment item as returned.
 * Body: { equipmentItemId: string }
 */
export async function PATCH(req: Request, props: RouteContext) {
    try {
        await dbConnect();

        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });

        const { id } = await props.params;
        const { equipmentItemId } = await req.json();

        if (!equipmentItemId) {
            return NextResponse.json({ error: "equipmentItemId is required" }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        const tenantFilter = getTenantFilter(session.user);

        let member: any = await Member.findOneAndUpdate(
            { _id: id, "equipmentTaken._id": equipmentItemId, ...tenantFilter },
            {
                $set: {
                    "equipmentTaken.$.isReturned":   true,
                    "equipmentTaken.$.returnedDate": new Date(),
                },
            },
            { returnDocument: 'after' }
        ).select("memberId name equipmentTaken");

        if (!member) {
            member = await EntertainmentMember.findOneAndUpdate(
                { _id: id, "equipmentTaken._id": equipmentItemId, ...tenantFilter },
                {
                    $set: {
                        "equipmentTaken.$.isReturned":   true,
                        "equipmentTaken.$.returnedDate": new Date(),
                    },
                },
                { returnDocument: 'after' }
            ).select("memberId name equipmentTaken");
        }

        if (!member) {
            await auditCrossTenantAccess(Member, id, session.user);
            await auditCrossTenantAccess(EntertainmentMember, id, session.user);
            return NextResponse.json({ error: "Not Found" }, {  status: 404 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        return NextResponse.json({ message: "Equipment marked as returned.", equipmentTaken: member.equipmentTaken }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    } catch (error) {
        console.error("[PATCH /api/members/[id]/equipment]", error);
        return NextResponse.json({ error: "Server error returning equipment" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}
