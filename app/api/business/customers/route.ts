import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import { BusinessCustomer } from "@/models/BusinessCustomer";
import { requireBusinessId } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        let businessId;
        try {
            businessId = requireBusinessId(session?.user);
        } catch (err: any) {
            return NextResponse.json({ error: err.message }, { status: err.message === "Unauthorized" ? 401 : 403 });
        }

        await dbConnect();

        const { searchParams } = new URL(req.url);
        const hasDue = searchParams.get("hasDue") === "true";

        let matchQuery: any = { businessId };
        if (hasDue) matchQuery.currentDue = { $gt: 0 };

        const customers = await BusinessCustomer.aggregate([
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

        return NextResponse.json(customers, {
            headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" }
        });
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "business_admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { name, phone, businessName, gstNumber, address } = body;

        let businessId;
        try {
            businessId = requireBusinessId(session?.user);
        } catch (err: any) {
            return NextResponse.json({ error: err.message }, { status: err.message === "Unauthorized" ? 401 : 403 });
        }

        if (!name) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }

        await dbConnect();

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
        return NextResponse.json(customer, {
            status: 201,
            headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" }
        });
    } catch (error) {
        return NextResponse.json({ error: "Failed to create customer" }, { status: 500 });
    }
}
