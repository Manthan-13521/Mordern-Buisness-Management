import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import { BusinessCustomer } from "@/models/BusinessCustomer";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "business_admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();
        const businessId = session.user.businessId;

        const { searchParams } = new URL(req.url);
        const hasDue = searchParams.get("hasDue") === "true";

        let matchQuery: any = { businessId };
        if (hasDue) matchQuery.currentDue = { $gt: 0 };

        const customers = await BusinessCustomer.aggregate([
            { $match: matchQuery },
            {
                $lookup: {
                    from: "businesstransactions",
                    let: { custId: "$_id" },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$customerId", "$$custId"] }, category: "SALE" } },
                        { $sort: { date: -1, createdAt: -1 } },
                        { $limit: 1 }
                    ],
                    as: "sales"
                }
            },
            {
                $lookup: {
                    from: "businesstransactions",
                    let: { custId: "$_id" },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$customerId", "$$custId"] }, category: "PAYMENT" } },
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

        if (!name) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }

        await dbConnect();
        const businessId = session.user.businessId;

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
