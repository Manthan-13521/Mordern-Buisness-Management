import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { HostelPayment } from "@/models/HostelPayment";
import { HostelMember } from "@/models/HostelMember";
import { HostelPaymentArchive } from "@/models/HostelPaymentArchive";
import { getToken } from "@/lib/universalAuth";

export const dynamic = "force-dynamic";

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const [token, body] = await Promise.all([getToken({ req: req as any }), req.json()]);
        await dbConnect();
        
        if (!token || token.role !== "hostel_admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        
        const hostelId = token.hostelId as string;
        const { id } = await context.params;
        const { amount, paymentMethod, notes } = body;
        const newAmount = Number(amount);

        if (!Number.isFinite(newAmount) || newAmount < 0) {
            return NextResponse.json({ error: "Invalid payment amount" }, { status: 400 });
        }

        const payment = await HostelPayment.findOne({ _id: id, hostelId, isDeleted: false });
        if (!payment) {
            return NextResponse.json({ error: "Payment not found" }, { status: 404 });
        }

        const member = await HostelMember.findOne({ _id: payment.memberId, hostelId });
        if (!member) {
            return NextResponse.json({ error: "Linked member not found" }, { status: 404 });
        }

        const difference = newAmount - payment.amount;

        // Apply native mathematical difference to the float
        const updatedBalance = member.balance + difference;
        const newStatus = (updatedBalance >= 0 && member.status === "defaulter") ? "active" : member.status;

        await HostelMember.updateOne(
            { _id: member._id, hostelId },
            { $set: { balance: updatedBalance, status: newStatus } }
        );

        payment.amount = newAmount;
        if (paymentMethod) payment.paymentMethod = paymentMethod;
        if (notes !== undefined) payment.notes = notes;
        
        await payment.save();

        return NextResponse.json({ success: true, payment });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Server Error" }, { status: 500 });
    }
}


export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const token = await getToken({ req: req as any });
        await dbConnect();
        
        if (!token || token.role !== "hostel_admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        
        const hostelId = token.hostelId as string;
        const { id } = await context.params;

        // Find the payment
        const payment = await HostelPayment.findOne({ _id: id, hostelId, isDeleted: false });
        if (!payment) {
            return NextResponse.json({ error: "Payment not found" }, { status: 404 });
        }

        const member = await HostelMember.findOne({ _id: payment.memberId, hostelId });
        
        // Reverse member balance logically if member still exists
        if (member) {
            const updatedBalance = member.balance - payment.amount;
            await HostelMember.updateOne(
                { _id: member._id, hostelId },
                { $set: { balance: updatedBalance } }
            );
        }

        // Write identical record to HostelPaymentArchive
        await HostelPaymentArchive.create({
            originalPaymentId: payment._id,
            hostelId: payment.hostelId,
            memberId: payment.memberId,
            amount: payment.amount,
            paymentMethod: payment.paymentMethod || "cash",
            paymentType: payment.paymentType,
            status: "refunded",
            originalCreatedAt: payment.createdAt,
            fullData: { ...payment.toObject(), deletedReason: "admin_revocation" }
        });

        // Natively erase from active set
        await HostelPayment.deleteOne({ _id: payment._id });

        return NextResponse.json({ success: true, message: "Payment successfully reversed and archived" });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Server Error" }, { status: 500 });
    }
}
