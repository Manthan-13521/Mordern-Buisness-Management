import { NextResponse } from "next/server";
import { resolveUser, AuthUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";
import { BusinessCustomer } from "@/models/BusinessCustomer";
import { BusinessTransaction } from "@/models/BusinessTransaction";
import mongoose from "mongoose";
import { requestContext } from "@/lib/requestContext";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ customerId: string }> }) {

        const requestId = req ? (req.headers.get("x-request-id") || crypto.randomUUID()) : crypto.randomUUID();
        const clientIp = req ? (req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown") : "unknown";
        const routePath = req ? new URL(req.url).pathname : "unknown";
        const requestMethod = "GET";

        return requestContext.run({
            requestId,
            ip: clientIp,
            route: routePath,
            method: requestMethod,
            startTime: Date.now()
        }, async () => {
            try {
            const { customerId } = await params;
            if (!mongoose.Types.ObjectId.isValid(customerId)) {
                return NextResponse.json({ error: "Invalid customerId format" }, { status: 400 });
            }
            const user = await resolveUser(req);
            if (!user || user.role !== "business_admin") {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }

            await dbConnect();
            const businessId = user.businessId;

            const customer = await BusinessCustomer.findOne({ _id: customerId, businessId }).lean();
            if (!customer) {
                return NextResponse.json({ error: "Customer not found" }, { status: 404 });
            }

            // Aggregate financial metrics from transactions
            const aggregation = await BusinessTransaction.aggregate([
                {
                    $match: {
                        customerId: new mongoose.Types.ObjectId(customerId),
                        businessId,
                    }
                },
                {
                    $group: {
                        _id: { category: "$category", transactionType: "$transactionType" },
                        total: { $sum: "$amount" },
                        paidTotal: { $sum: { $ifNull: ["$paidAmount", 0] } },
                    }
                }
            ]);

            // Extract metrics from aggregation results
            let productSent = 0;
            let productReceived = 0;
            let paymentReceived = 0;
            let paymentGiven = 0;

            for (const bucket of aggregation) {
                const { category, transactionType } = bucket._id;
                if (category === "SALE" && transactionType === "sent") {
                    productSent = bucket.total;
                } else if (category === "SALE" && transactionType === "received") {
                    productReceived = bucket.total;
                } else if (category === "PAYMENT" && transactionType === "received") {
                    paymentReceived = bucket.total;
                } else if (category === "PAYMENT" && (transactionType === "paid" || transactionType === "sent")) {
                    paymentGiven += bucket.total;
                }
            }

            // Also account for paidAmount on SALE records (inline payments during sales)
            for (const bucket of aggregation) {
                const { category, transactionType } = bucket._id;
                if (category === "SALE" && bucket.paidTotal > 0) {
                    if (transactionType === "sent") {
                        paymentReceived += bucket.paidTotal;
                    } else if (transactionType === "received") {
                        paymentGiven += bucket.paidTotal;
                    }
                }
            }

            const currentBalance = (productSent - productReceived) - (paymentReceived - paymentGiven);

            return NextResponse.json({
                ...customer,
                financials: {
                    productSent,
                    productReceived,
                    paymentReceived,
                    paymentGiven,
                    currentBalance,
                }
            }, {
                headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" }
            });
        } catch (error) {
            return NextResponse.json({ error: "Failed to fetch customer" }, { status: 500 });
        }
        });
            
}

export async function PATCH(req: Request, { params }: { params: Promise<{ customerId: string }> }) {

        const requestId = req ? (req.headers.get("x-request-id") || crypto.randomUUID()) : crypto.randomUUID();
        const clientIp = req ? (req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown") : "unknown";
        const routePath = req ? new URL(req.url).pathname : "unknown";
        const requestMethod = "PATCH";

        return requestContext.run({
            requestId,
            ip: clientIp,
            route: routePath,
            method: requestMethod,
            startTime: Date.now()
        }, async () => {
            try {
            const { customerId } = await params;
            if (!mongoose.Types.ObjectId.isValid(customerId)) {
                return NextResponse.json({ error: "Invalid customerId format" }, { status: 400 });
            }
            const user = await resolveUser(req);
            if (!user || user.role !== "business_admin") {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }

            const body = await req.json();
            const { name, phone, businessName, gstNumber, address } = body;

            await dbConnect();
            const businessId = user.businessId;

            const customer = await BusinessCustomer.findOneAndUpdate(
                { _id: customerId, businessId },
                { $set: { name, phone, businessName, gstNumber, address } },
                { new: true }
            );

            if (!customer) {
                return NextResponse.json({ error: "Customer not found" }, { status: 404 });
            }

            return NextResponse.json(customer, {
                headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" }
            });
        } catch (error) {
            return NextResponse.json({ error: "Failed to update customer" }, { status: 500 });
        }
        });
            
}
