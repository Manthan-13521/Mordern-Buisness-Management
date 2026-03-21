import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { Member } from "@/models/Member";
import { EntertainmentMember } from "@/models/EntertainmentMember";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/members/[id]/equipment
 * Issues a new equipment item to the member.
 * Body: { itemName: string }
 */
export async function POST(req: Request, props: RouteContext) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id } = await props.params;
        const { itemName } = await req.json();

        if (!itemName?.trim()) {
            return NextResponse.json({ error: "itemName is required" }, { status: 400 });
        }

        await dbConnect();

        let member: any = await Member.findByIdAndUpdate(
            id,
            {
                $push: {
                    equipmentTaken: {
                        itemName:    itemName.trim(),
                        issuedDate:  new Date(),
                        isReturned:  false,
                    },
                },
            },
            { new: true }
        ).select("memberId name equipmentTaken");

        if (!member) {
            member = await EntertainmentMember.findByIdAndUpdate(
                id,
                {
                    $push: {
                        equipmentTaken: {
                            itemName:    itemName.trim(),
                            issuedDate:  new Date(),
                            isReturned:  false,
                        },
                    },
                },
                { new: true }
            ).select("memberId name equipmentTaken");
        }

        if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });

        return NextResponse.json({ message: "Equipment issued.", equipmentTaken: member.equipmentTaken });
    } catch (error) {
        console.error("[POST /api/members/[id]/equipment]", error);
        return NextResponse.json({ error: "Server error issuing equipment" }, { status: 500 });
    }
}

/**
 * PATCH /api/members/[id]/equipment
 * Marks an equipment item as returned.
 * Body: { equipmentItemId: string }
 */
export async function PATCH(req: Request, props: RouteContext) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id } = await props.params;
        const { equipmentItemId } = await req.json();

        if (!equipmentItemId) {
            return NextResponse.json({ error: "equipmentItemId is required" }, { status: 400 });
        }

        await dbConnect();

        let member: any = await Member.findOneAndUpdate(
            { _id: id, "equipmentTaken._id": equipmentItemId },
            {
                $set: {
                    "equipmentTaken.$.isReturned":   true,
                    "equipmentTaken.$.returnedDate": new Date(),
                },
            },
            { new: true }
        ).select("memberId name equipmentTaken");

        if (!member) {
            member = await EntertainmentMember.findOneAndUpdate(
                { _id: id, "equipmentTaken._id": equipmentItemId },
                {
                    $set: {
                        "equipmentTaken.$.isReturned":   true,
                        "equipmentTaken.$.returnedDate": new Date(),
                    },
                },
                { new: true }
            ).select("memberId name equipmentTaken");
        }

        if (!member) {
            return NextResponse.json(
                { error: "Member or equipment item not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ message: "Equipment marked as returned.", equipmentTaken: member.equipmentTaken });
    } catch (error) {
        console.error("[PATCH /api/members/[id]/equipment]", error);
        return NextResponse.json({ error: "Server error returning equipment" }, { status: 500 });
    }
}
