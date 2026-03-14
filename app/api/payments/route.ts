import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { Payment } from "@/models/Payment";
import { Member } from "@/models/Member";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import mongoose from "mongoose";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        await connectDB();
        const baseMatch = session.user.role !== "superadmin" && session.user.poolId ? { poolId: session.user.poolId } : {};

        const payments = await Payment.find({ ...baseMatch })
            .populate("memberId", "name memberId")
            .populate("planId", "name")
            .populate("recordedBy", "name")
            .sort({ date: -1 });

        return NextResponse.json(payments);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const { memberId, planId, amount, paymentMethod, transactionId } = body;

        if (!memberId || !planId || !amount || !paymentMethod) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        if (paymentMethod === "upi" && !transactionId) {
            return NextResponse.json({ error: "UPI payments require a Transaction ID" }, { status: 400 });
        }

        await connectDB();

        const payment = new Payment({
            memberId: new mongoose.Types.ObjectId(memberId as string),
            planId: new mongoose.Types.ObjectId(planId as string),
            poolId: session.user.poolId, // explicitly bind payment to tenant
            amount: Number(amount),
            paymentMethod,
            transactionId: transactionId || undefined,
            recordedBy: new mongoose.Types.ObjectId(session.user.id),
            status: "success",
        });

        await payment.save();

        return NextResponse.json(payment, { status: 201 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Server error recording payment" }, { status: 500 });
    }
}
