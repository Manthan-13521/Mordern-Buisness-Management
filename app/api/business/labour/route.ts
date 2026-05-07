import { NextResponse } from "next/server";
import { resolveUser, AuthUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";
import { BusinessLabour } from "@/models/BusinessLabour";
import { BusinessAttendance } from "@/models/BusinessAttendance";
import { BusinessLabourAdvance } from "@/models/BusinessLabourAdvance";
import { requireBusinessId } from "@/lib/tenant";
import { logger } from "@/lib/logger";
import { z } from "zod";

export const dynamic = "force-dynamic";

const LabourCreateSchema = z.object({
    name: z.string().min(1, "Name is required").max(100),
    role: z.string().min(1, "Role is required").max(50),
    salary: z.number().min(0).max(9999999),
    phone: z.string().max(15).optional(),
});

export async function GET(req: Request) {
    try {
        const user = await resolveUser(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        let businessId;
        try {
            businessId = requireBusinessId(user);
        } catch (err: any) {
            return NextResponse.json({ error: err.message }, { status: err.message === "Unauthorized" ? 401 : 403 });
        }

        if (process.env.DEBUG_ANALYTICS === "true") {
            logger.debug("Business labour list", { businessId, userId: user.id });
        }

        await dbConnect();

        // 🔴 TERMINAL DEFENSE
        if (!businessId) {
            throw new Error("Tenant context lost before query execution");
        }

        const now = new Date();
        const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

        const laboursRaw = await BusinessLabour.aggregate([
            { $match: { businessId, isActive: true } },
            {
                $lookup: {
                    from: "businessattendances",
                    let: { labId: "$_id", businessId: "$businessId" },
                    pipeline: [
                        { $match: { 
                            $expr: { 
                                $and: [
                                    { $eq: ["$labourId", "$$labId"] },
                                    { $eq: ["$businessId", "$$businessId"] }
                                ]
                            } 
                        }},
                        { $sort: { date: -1 } }
                    ],
                    as: "recentAttendance"
                }
            },
            {
                $lookup: {
                    from: "businesslabourpayments",
                    let: { labId: "$_id", businessId: "$businessId" },
                    pipeline: [
                        { $match: { 
                            $expr: { 
                                $and: [
                                    { $eq: ["$labourId", "$$labId"] },
                                    { $eq: ["$businessId", "$$businessId"] }
                                ]
                            } 
                        }},
                        { $sort: { date: -1 } }
                    ],
                    as: "payments"
                }
            },
            {
                $lookup: {
                    from: "businesslabouradvances",
                    let: { labId: "$_id", businessId: "$businessId" },
                    pipeline: [
                        { $match: { 
                            $expr: { 
                                $and: [
                                    { $eq: ["$labourId", "$$labId"] },
                                    { $eq: ["$businessId", "$$businessId"] },
                                    { $eq: ["$month", currentMonthKey] }
                                ]
                            } 
                        }}
                    ],
                    as: "advances"
                }
            },
            {
                $addFields: {
                    advancePaid: { $ifNull: [{ $arrayElemAt: ["$advances.amount", 0] }, 0] }
                }
            },
            { $sort: { name: 1 } }
        ]).option({ maxTimeMS: 10_000 });

        const labours = Array.isArray(laboursRaw) ? laboursRaw : [];

        return NextResponse.json({
            data: labours,
            meta: {
                count: labours.length,
                businessId,
                timestamp: new Date().toISOString()
            }
        }, {
            headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" }
        });
    } catch (error: any) {
        return NextResponse.json({ 
            data: [],
            meta: {
                error: "Failed to fetch labour",
                details: error.message,
                timestamp: new Date().toISOString()
            }
        }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const user = await resolveUser(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        if (user.role !== "business_admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const parsed = LabourCreateSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        const { name, role, salary, phone } = parsed.data;

        let businessId;
        try {
            businessId = requireBusinessId(user);
        } catch (err: any) {
            return NextResponse.json({ error: err.message }, { status: err.message === "Unauthorized" ? 401 : 403 });
        }

        logger.debug("Business labour create", { businessId, userId: user.id });

        await dbConnect();

        // 🔴 TERMINAL DEFENSE
        if (!businessId) {
            throw new Error("Tenant context lost before database operation");
        }

        const labour = new BusinessLabour({
            name,
            role,
            salary,
            phone,
            businessId,
            isActive: true
        });

        await labour.save();

        return NextResponse.json({
            data: labour,
            meta: {
                message: "Labour record created successfully",
                businessId,
                timestamp: new Date().toISOString()
            }
        }, {
            status: 201,
            headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" }
        });
    } catch (error: any) {
        return NextResponse.json({ 
            data: null,
            meta: {
                error: "Failed to create labour",
                details: error.message,
                timestamp: new Date().toISOString()
            }
        }, { status: 500 });
    }
}
