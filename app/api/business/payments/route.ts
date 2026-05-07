import { NextResponse } from "next/server";
import { resolveUser, AuthUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";
import { BusinessTransaction } from "@/models/BusinessTransaction";
import { BusinessCustomer } from "@/models/BusinessCustomer";
import { logger } from "@/lib/logger";
import { PaymentSchema } from "@/lib/shared/types";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

// PaymentSchema is imported from @/lib/shared/types

export async function GET(req: Request) {
    try {
        const user = await resolveUser(req);
        if (!user || user.role !== "business_admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();
        const businessId = user.businessId;

        const { searchParams } = new URL(req.url);
        const customerId = searchParams.get("customerId");
        const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
        const limit = Math.min(20, Math.max(1, parseInt(searchParams.get("limit") ?? "20")));
        const skip = (page - 1) * limit;

        let query: any = { businessId };
        if (customerId) {
            query.customerId = customerId;
        }

        const [payments, total] = await Promise.all([
            BusinessTransaction.find({ 
                ...query, 
                $or: [
                    { category: 'PAYMENT' },
                    { category: 'SALE', paidAmount: { $gt: 0 } }
                ]
            })
                .populate("customerId", "name")
                .select("customerId category amount paidAmount date transactionType paymentMethod notes receiptUrl fileUrl createdAt")
                .sort({ date: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            BusinessTransaction.countDocuments({ 
                ...query, 
                $or: [
                    { category: 'PAYMENT' },
                    { category: 'SALE', paidAmount: { $gt: 0 } }
                ]
            }),
        ]);

            return NextResponse.json({ success: true, data: payments, total, page, limit, totalPages: Math.ceil(total / limit) }, {
                headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" }
            });
        } catch (error: any) {
            logger.error("Failed to fetch payments", { error: error.message });
            return NextResponse.json({ success: false, error: "Failed to fetch payments" }, { status: 500 });
        }
    }

export async function POST(req: Request) {
    let body: any;
    try {
        const user = await resolveUser(req);
        if (!user || user.role !== "business_admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        try {
            body = await req.json();
        } catch (e) {
            return NextResponse.json({ success: false, error: "Invalid JSON payload" }, { status: 400 });
        }

        const parseResult = PaymentSchema.safeParse(body);
        if (!parseResult.success) {
            return NextResponse.json({ 
                success: false, 
                error: "Validation failed", 
                details: parseResult.error.flatten().fieldErrors 
            }, { status: 400 });
        }

        const { customerId, amount, type, fileUrl, receiptUrl, paymentType, date, notes } = parseResult.data;

        await dbConnect();
        const businessId = user.businessId;

        const payment = new BusinessTransaction({
            customerId,
            amount,
            category: 'PAYMENT',
            paymentMethod: type,
            fileUrl,
            transactionType: paymentType,
            businessId,
            date: date ? new Date(date) : new Date(),
            notes,
            receiptUrl: receiptUrl || fileUrl
        });

        await payment.save();

        // Update customer balance
        const incObject: any = {};
        if (paymentType === "received") {
            incObject.totalPaid = amount;
            incObject.currentDue = -amount;
        } else {
            incObject.totalPaid = -amount;
            incObject.currentDue = amount;
        }

        await BusinessCustomer.findOneAndUpdate(
            { _id: customerId, businessId },
            { $inc: incObject }
        );

        return NextResponse.json({ success: true, data: payment }, {
            status: 201,
            headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" }
        });
    } catch (error: any) {
        logger.error("Payment recording error", {
            error: error.message,
        });
        return NextResponse.json({ 
            success: false,
            error: "Failed to create payment", 
            details: error.message 
        }, { status: 500 });
    }
}
