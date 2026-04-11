import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import { BusinessTransaction } from "@/models/BusinessTransaction";
import { BusinessCustomer } from "@/models/BusinessCustomer";
import mongoose from "mongoose";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "business_admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();
        const businessId = session.user.businessId;

        const { searchParams } = new URL(req.url);
        const customerId = searchParams.get("customerId");

        let query: any = { businessId };
        if (customerId) {
            query.customerId = customerId;
        }

        const sales = await BusinessTransaction.find({ ...query, category: 'SALE' })
            .populate("customerId", "name")
            .sort({ date: -1 });
        return NextResponse.json(sales);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch sales" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    let body: any;
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "business_admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        try {
            body = await req.json();
        } catch (e) {
            return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
        }

        const { customerId, items, transportationCost, totalAmount, date, saleType = 'sent', receiptUrl, paidAmount = 0 } = body;

        if (!customerId || !items || !totalAmount) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        await dbConnect();
        const businessId = session.user.businessId;

        const sale = new BusinessTransaction({
            customerId,
            items,
            transportationCost: transportationCost || 0,
            amount: totalAmount,
            paidAmount: Number(paidAmount) || 0,
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
                    currentDue: isReceived ? -totalAmount : (totalAmount - paidAmount)
                } 
            }
        );

        return NextResponse.json(sale, { status: 201 });
    } catch (error: any) {
        console.error("Sale Recording Error Details:", {
            error: error.message,
            stack: error.stack,
            body: body
        });
        return NextResponse.json({ 
            error: "Failed to create sale", 
            details: error.message 
        }, { status: 500 });
    }
}
