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

        const payments = await BusinessTransaction.find({ ...query, category: 'PAYMENT' })
            .populate("customerId", "name")
            .sort({ date: -1 });
        return NextResponse.json(payments);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 });
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

        const { customerId, amount, type, fileUrl, receiptUrl, paymentType, date, notes } = body;

        if (!customerId || !amount || !type || !paymentType) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        await dbConnect();
        const businessId = session.user.businessId;

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

        return NextResponse.json(payment, { status: 201 });
    } catch (error: any) {
        console.error("Payment Recording Error Details:", {
            error: error.message,
            stack: error.stack,
            body: body
        });
        return NextResponse.json({ 
            error: "Failed to create payment", 
            details: error.message 
        }, { status: 500 });
    }
}
