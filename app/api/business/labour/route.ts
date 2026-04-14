import { NextResponse } from "next/server";
import { resolveUser, AuthUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";
import { BusinessLabour } from "@/models/BusinessLabour";
import { BusinessAttendance } from "@/models/BusinessAttendance";
import { requireBusinessId } from "@/lib/tenant";

export const dynamic = "force-dynamic";

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

        // 🟢 STRUCTURED AUDIT LOGGING
        console.info(JSON.stringify({
            type: "BUSINESS_LABOUR_LIST",
            businessId,
            userId: user.id,
            route: "/api/business/labour",
            method: "GET",
            timestamp: new Date().toISOString()
        }));

        await dbConnect();

        // 🔴 TERMINAL DEFENSE
        if (!businessId) {
            throw new Error("Tenant context lost before query execution");
        }

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
            { $sort: { name: 1 } }
        ]);

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
        const { name, role, salary, phone } = body;

        let businessId;
        try {
            businessId = requireBusinessId(user);
        } catch (err: any) {
            return NextResponse.json({ error: err.message }, { status: err.message === "Unauthorized" ? 401 : 403 });
        }

        if (!name || !role || !salary) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // 🟢 STRUCTURED AUDIT LOGGING
        console.info(JSON.stringify({
            type: "BUSINESS_LABOUR_CREATE",
            businessId,
            userId: user.id,
            route: "/api/business/labour",
            method: "POST",
            timestamp: new Date().toISOString()
        }));

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
