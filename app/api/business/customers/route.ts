import { NextResponse } from "next/server";
import { resolveUser, AuthUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";
import { BusinessCustomer } from "@/models/BusinessCustomer";
import { requireBusinessId } from "@/lib/tenant";
import { logger } from "@/lib/logger";
import { z } from "zod";

export const dynamic = "force-dynamic";

const CustomerCreateSchema = z.object({
    name: z.string().min(1, "Name is required").max(100),
    phone: z.string().max(15).optional(),
    businessName: z.string().max(200).optional(),
    gstNumber: z.string().max(20).optional(),
    address: z.string().max(500).optional(),
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
            logger.debug("Business customers list", { businessId, userId: user.id });
        }

        await dbConnect();

        // 🔴 TERMINAL DEFENSE
        if (!businessId) {
            throw new Error("Tenant context lost before query execution");
        }

        const { searchParams } = new URL(req.url);
        const hasDue = searchParams.get("hasDue") === "true";

        let matchQuery: any = { businessId };
        if (hasDue) matchQuery.currentDue = { $gt: 0 };

        const customersRaw = await BusinessCustomer.aggregate([
            { $match: matchQuery },
            {
                $lookup: {
                    from: "businesstransactions",
                    let: { custId: "$_id", businessId: "$businessId" },
                    pipeline: [
                        { $match: { 
                            $expr: { 
                                $and: [
                                    { $eq: ["$customerId", "$$custId"] },
                                    { $eq: ["$businessId", "$$businessId"] }
                                ]
                            }, 
                            category: "SALE" 
                        }},
                        { $sort: { date: -1, createdAt: -1 } },
                        { $limit: 1 }
                    ],
                    as: "sales"
                }
            },
            {
                $lookup: {
                    from: "businesstransactions",
                    let: { custId: "$_id", businessId: "$businessId" },
                    pipeline: [
                        { $match: { 
                            $expr: { 
                                $and: [
                                    { $eq: ["$customerId", "$$custId"] },
                                    { $eq: ["$businessId", "$$businessId"] }
                                ]
                            }, 
                            category: "PAYMENT" 
                        }},
                        { $sort: { date: -1, createdAt: -1 } },
                        { $limit: 1 }
                    ],
                    as: "payments"
                }
            },
            {
                $addFields: {
                    lastSale: { $arrayElemAt: ["$sales", 0] },
                    lastPayment: { $arrayElemAt: ["$payments", 0] }
                }
            },
            { $project: { sales: 0, payments: 0 } },
            { $sort: { name: 1 } }
        ]);

        const customers = Array.isArray(customersRaw) ? customersRaw : [];

        return NextResponse.json({
            data: customers,
            meta: {
                count: customers.length,
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
                error: "Failed to fetch customers",
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
        const parsed = CustomerCreateSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        const { name, phone, businessName, gstNumber, address } = parsed.data;

        let businessId;
        try {
            businessId = requireBusinessId(user);
        } catch (err: any) {
            return NextResponse.json({ error: err.message }, { status: err.message === "Unauthorized" ? 401 : 403 });
        }

        logger.debug("Business customer create", { businessId, userId: user.id });

        await dbConnect();

        // 🔴 TERMINAL DEFENSE
        if (!businessId) {
            throw new Error("Tenant context lost before database operation");
        }

        const customer = new BusinessCustomer({
            name,
            phone,
            businessName,
            gstNumber,
            address,
            businessId,
            totalPurchase: 0,
            totalPaid: 0,
            currentDue: 0
        });

        await customer.save();

        return NextResponse.json({
            data: customer,
            meta: {
                message: "Customer created successfully",
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
                error: "Failed to create customer",
                details: error.message,
                timestamp: new Date().toISOString()
            }
        }, { status: 500 });
    }
}
