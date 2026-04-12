import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { getToken } from "next-auth/jwt";
import { HostelPayment } from "@/models/HostelPayment";
import { HostelMember } from "@/models/HostelMember";
import { HostelBlock } from "@/models/HostelBlock";
import { HostelLog } from "@/models/HostelLog";
import { HostelAnalytics } from "@/models/HostelAnalytics";
import mongoose from "mongoose";
import { HostelPaymentLog } from "@/models/HostelPaymentLog";

export const dynamic = "force-dynamic";

// GET /api/hostel/payments — list payments (with optional block filter)
export async function GET(req: Request) {
    try {
        const [token] = await Promise.all([getToken({ req: req as any }), dbConnect()]);
        if (!token || token.role !== "hostel_admin") {
            return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }
        const hostelId = token.hostelId as string;
        if (!hostelId) return NextResponse.json({ error: "Forbidden" }, {  status: 403 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });

        const url = new URL(req.url);
        const page     = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
        const limit    = 11;
        const skip     = (page - 1) * limit;
        const memberId = url.searchParams.get("memberId") || "";
        const block    = url.searchParams.get("block") || "";

        const baseMatch: Record<string, unknown> = { hostelId, isDeleted: false };
        if (memberId) baseMatch.memberId = new mongoose.Types.ObjectId(memberId);

        // Block filter — resolve block → member IDs → filter payments
        if (block && block !== "all") {
            const blockObj = await HostelBlock.findOne({ hostelId, name: block }).lean() as any;
            if (blockObj) {
                const memberIds = await HostelMember.distinct("_id", {
                    hostelId,
                    blockId: blockObj._id,
                    isDeleted: false,
                });
                baseMatch.memberId = { $in: memberIds };
            } else {
                // Unknown block → return empty
                return NextResponse.json({ data: [], total: 0, page, limit, totalPages: 0 }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
            }
        }

        const [payments, total] = await Promise.all([
            HostelPayment.find(baseMatch)
                .populate("memberId", "name memberId blockNo floorNo roomNo")
                .populate("planId", "name price")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            HostelPayment.countDocuments(baseMatch),
        ]);

        return NextResponse.json({ data: payments, total, page, limit, totalPages: Math.ceil(total / limit) }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    } catch (error) {
        console.error("[GET /api/hostel/payments]", error);
        return NextResponse.json({ error: "Failed to fetch payments" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}

// POST /api/hostel/payments — add a payment (ledger cycle)
export async function POST(req: Request) {
    try {
        const [token, body] = await Promise.all([getToken({ req: req as any }), req.json()]);
        await dbConnect();
        if (!token || token.role !== "hostel_admin") {
            return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }
        const hostelId = token.hostelId as string;
        if (!hostelId) return NextResponse.json({ error: "Forbidden" }, {  status: 403 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });

        const { memberId, amount, paymentMethod, transactionId, notes, paymentType: rawPaymentType, idempotencyKey } = body;
        
        const paid = Number(amount);
        if (!memberId || !Number.isFinite(paid) || paid <= 0 || paid > 9_999_999_999) {
            return NextResponse.json({ error: "Invalid payment amount or member info" }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        // ── Idempotency Check (Duplicate Request Guard) ──
        if (idempotencyKey) {
            const existing = await HostelPayment.findOne({ idempotencyKey, hostelId }).lean();
            if (existing) {
                return NextResponse.json({ message: "Duplicate payment requested", payment: existing }, {  status: 200 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
            }
        }

        const member = await HostelMember.findOne({ _id: memberId, hostelId, isDeleted: false, status: { $in: ["active", "defaulter"] } });
        if (!member) {
            return NextResponse.json({ error: "Active member not found" }, {  status: 404 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        const paymentType = (rawPaymentType as string) || "balance";
        
        let currentBalance = member.balance + paid;
        
        const paymentDate = new Date();
        const yearMonth = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, "0")}`;
        
        const incomeTypes = ["initial", "renewal", "balance"];
        const incomeIncrement = incomeTypes.includes(paymentType)
            ? paid
            : paymentType === "refund"
            ? -paid
            : 0;

        const payment = await HostelPayment.create({
            hostelId,
            memberId: new mongoose.Types.ObjectId(memberId),
            planId: member.planId,
            amount: paid,
            paymentMethod: paymentMethod || "cash",
            transactionId,
            notes,
            status: "success",
            paymentType,
            idempotencyKey,
        });

        const finalStatus = (currentBalance >= 0 && member.status === "defaulter") ? "active" : member.status;

        await HostelMember.updateOne(
            { _id: member._id, hostelId },
            { $set: { balance: currentBalance, status: finalStatus } }
        );

        await HostelAnalytics.updateOne(
            { hostelId, date: yearMonth },
            { $inc: { totalIncome: incomeIncrement } },
            { upsert: true }
        );

        const createdByName = (token.name || token.email || "Admin") as string;
        await HostelPaymentLog.create({
            hostelId,
            memberId: member.memberId,
            memberName: member.name,
            amount: paid,
            paymentType: paymentType as any,
            payment_date: paymentDate,
            createdBy: createdByName,
        });

        return NextResponse.json(payment, {  status: 201 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    } catch (error: any) {
        // Catch duplicate key collision organically
        if (error?.code === 11000 && error?.keyPattern?.idempotencyKey) {
            const existing = await HostelPayment.findOne({ idempotencyKey: error.keyValue?.idempotencyKey }).lean();
            return NextResponse.json({ message: "Duplicate payment requested", payment: existing }, {  status: 200 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }
        console.error("[POST /api/hostel/payments]", error);
        return NextResponse.json({ error: error?.message || "Server error" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}
