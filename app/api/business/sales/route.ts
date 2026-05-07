import { NextResponse } from "next/server";
import { resolveUser, AuthUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";
import { BusinessTransaction } from "@/models/BusinessTransaction";
import { BusinessCustomer } from "@/models/BusinessCustomer";
import { logger } from "@/lib/logger";
import { SaleSchema } from "@/lib/shared/types";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

// SaleSchema is imported from @/lib/shared/types

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

            const [sales, total] = await Promise.all([
                BusinessTransaction.find({ ...query, category: 'SALE' })
                    .populate("customerId", "name")
                    .select("customerId items amount paidAmount date transactionType receiptUrl transportationCost category createdAt")
                    .sort({ date: -1 })
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                BusinessTransaction.countDocuments({ ...query, category: 'SALE' }),
            ]);
                
            return NextResponse.json({ success: true, data: sales, total, page, limit, totalPages: Math.ceil(total / limit) }, {
                headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" }
            });
        } catch (error: any) {
            logger.error("Failed to fetch sales", { error: error.message });
            return NextResponse.json({ success: false, error: "Failed to fetch sales" }, { status: 500 });
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

        const parseResult = SaleSchema.safeParse(body);
        if (!parseResult.success) {
            return NextResponse.json({ 
                success: false, 
                error: "Validation failed", 
                details: parseResult.error.flatten().fieldErrors 
            }, { status: 400 });
        }

        const { customerId, items, transportationCost, totalAmount, date, saleType, receiptUrl, paidAmount } = parseResult.data;

        await dbConnect();
        const businessId = user.businessId;

        const sale = new BusinessTransaction({
            customerId,
            items,
            transportationCost,
            amount: totalAmount,
            paidAmount,
            category: 'SALE',
            businessId,
            date: date ? new Date(date) : new Date(),
            transactionType: saleType,
            receiptUrl
        });

        await sale.save();

        // Update customer balance based on saleType and paidAmount
        const isReceived = saleType === 'received';
        await BusinessCustomer.findOneAndUpdate(
            { _id: customerId, businessId },
            { 
                $inc: { 
                    totalPurchase: isReceived ? 0 : totalAmount, 
                    totalPaid: isReceived ? 0 : paidAmount,
                    currentDue: isReceived ? -(totalAmount - paidAmount) : (totalAmount - paidAmount)
                } 
            }
        );

        return NextResponse.json({ success: true, data: sale }, {
            status: 201,
            headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" }
        });
    } catch (error: any) {
        logger.error("Sale recording error", {
            error: error.message,
        });
        return NextResponse.json({ 
            success: false,
            error: "Failed to create sale", 
            details: error.message 
        }, { status: 500 });
    }
}
