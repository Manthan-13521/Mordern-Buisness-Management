import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { Member } from "@/models/Member";
import { EntertainmentMember } from "@/models/EntertainmentMember";
import { getTenantFilter } from "@/lib/tenant";
import { resolveUser, AuthUser } from "@/lib/authHelper";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
    try {
        const [, user] = await Promise.all([
            dbConnect(),
            resolveUser(req),
        ]);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        const { searchParams } = new URL(req.url);
        const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
        const limit = Math.min(20, Math.max(1, parseInt(searchParams.get("limit") || "20")));
        const skip = (page - 1) * limit;
        const memberType = searchParams.get("type") || "all";

        const now = new Date();

        // ── Tenant isolation guard ───────────────────────────────────────────
        if (user.role !== "superadmin" && !user.poolId) {
            return NextResponse.json({ error: "No pool assigned to this account" }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }
        const tenantFilter = getTenantFilter(user);

        const baseMatch: any = {
            isDeleted: false,
            ...tenantFilter,
            $or: [
                { status: "expired" },
                { isExpired: true },
                { planEndDate: { $lt: now } },
                { expiryDate: { $lt: now } }
            ]
        };

        if (memberType === "member") {
            baseMatch.memberType = "regular";
        } else if (memberType === "entertainment") {
            baseMatch.memberType = "entertainment";
        }

        const includeRegular = memberType === "all" || memberType === "member";
        const includeEntertainment = memberType === "all" || memberType === "entertainment";

        const pipeline: any[] = [];
        
        if (includeRegular) {
            pipeline.push({ $match: baseMatch });
            pipeline.push({ $addFields: { _source: "regular" } });
        } else if (includeEntertainment) {
            pipeline.push({ $match: { _id: null } }); 
        }

        if (includeEntertainment) {
            pipeline.push({
                $unionWith: {
                    coll: "entertainment_members",
                    pipeline: [
                        { $match: baseMatch },
                        { $addFields: { _source: "entertainment" } }
                    ]
                }
            });
        }
        
        if (!includeRegular && includeEntertainment) {
            pipeline.push({ $match: { _source: "entertainment" } });
        }

        pipeline.push(
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
                    qrToken: 0,
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
        );

        // Run counts + aggregate in parallel
        const [regularBaseCount, entertainmentBaseCount, members] = await Promise.all([
            includeRegular ? Member.countDocuments(baseMatch) : 0,
            includeEntertainment ? EntertainmentMember.countDocuments(baseMatch) : 0,
            Member.aggregate(pipeline),
        ]);
        
        const total = regularBaseCount + entertainmentBaseCount;

        return NextResponse.json({
            members,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to fetch expired members" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}
