import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { Member } from "@/models/Member";
import { EntertainmentMember } from "@/models/EntertainmentMember";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
    try {
        const [, session] = await Promise.all([
            dbConnect(),
            getServerSession(authOptions),
        ]);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50")));
        const skip = (page - 1) * limit;

        const now = new Date();
        const baseMatch: any = {
            isDeleted: false,
            $or: [
                { status: "expired" },
                { isExpired: true },
                { planEndDate: { $lt: now } },
                { expiryDate: { $lt: now } }
            ]
        };

        if (session.user.role !== "superadmin") {
            baseMatch.poolId = session.user.poolId || "UNASSIGNED_POOL";
        }

        const pipeline: any[] = [
            { $match: baseMatch },
            {
                $unionWith: {
                    coll: "entertainment_members",
                    pipeline: [
                        { $match: baseMatch }
                    ]
                }
            },
            { $sort: { planEndDate: -1, createdAt: -1 } },
            { $skip: skip },
            { $limit: limit },
            {
                $lookup: {
                    from: "plans",
                    localField: "planId",
                    foreignField: "_id",
                    as: "_plan"
                }
            },
            { $addFields: { planDetails: { $arrayElemAt: ["$_plan", 0] } } },
            {
                $project: {
                    memberId: 1,
                    name: 1,
                    phone: 1,
                    age: 1,
                    qrToken: 1,
                    planId: {
                        _id: "$planDetails._id",
                        name: "$planDetails.name",
                        durationDays: "$planDetails.durationDays",
                        durationHours: "$planDetails.durationHours",
                        price: "$planDetails.price"
                    },
                    expiryDate: { $ifNull: ["$planEndDate", "$expiryDate"] },
                    status: 1,
                    photoUrl: 1,
                    createdAt: 1
                }
            }
        ];

        const [members, regularTotal, entTotal] = await Promise.all([
            Member.aggregate(pipeline),
            Member.countDocuments(baseMatch),
            EntertainmentMember.countDocuments(baseMatch),
        ]);
        
        const total = regularTotal + entTotal;

        return NextResponse.json({
            members,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to fetch expired members" }, { status: 500 });
    }
}
