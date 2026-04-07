import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { getToken } from "next-auth/jwt";
import { HostelMember } from "@/models/HostelMember";
import { HostelPayment } from "@/models/HostelPayment";
import { HostelPlan } from "@/models/HostelPlan";
import { HostelRenewal } from "@/models/HostelRenewal";
import { HostelLog } from "@/models/HostelLog";
import { HostelAnalytics } from "@/models/HostelAnalytics";
import mongoose from "mongoose";
import { HostelPaymentLog } from "@/models/HostelPaymentLog";

export const dynamic = "force-dynamic";

/**
 * POST /api/hostel/members/[id]/renew
 * Ledger-aware renewal: updates rent_amount, due_date, balance.
 * Atomically records payment + analytics.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    let session = null;
    try {
        const [token, { id }, body] = await Promise.all([getToken({ req: req as any }), params, req.json()]);
        await dbConnect();
        if (!token || token.role !== "hostel_admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const hostelId = token.hostelId as string;

        const { planId, paidAmount, paymentMode, transactionId, notes, idempotencyKey } = body;
        
        const paid = Number(paidAmount);
        if (!planId || !Number.isFinite(paid) || paid < 0 || paid > 9_999_999_999) {
            return NextResponse.json({ error: "Invalid payment amount or missing planId" }, { status: 400 });
        }

        if (idempotencyKey) {
            const existing = await HostelRenewal.findOne({ idempotencyKey, hostelId }).lean();
            if (existing) {
                return NextResponse.json({ message: "Duplicate renewal requested", success: true }, { status: 200 });
            }
        }

        session = await mongoose.startSession();
        session.startTransaction();

        // Step 1: Fetch existing member
        const member = await HostelMember.findOne({ _id: id, hostelId, isDeleted: false }).session(session);
        if (!member) {
            await session.abortTransaction();
            return NextResponse.json({ error: "Member not found" }, { status: 404 });
        }

        // Step 2: Validate new plan
        const plan = await HostelPlan.findOne({ _id: planId, hostelId, isActive: true }).lean() as any;
        if (!plan) {
            await session.abortTransaction();
            return NextResponse.json({ error: "Invalid or inactive plan" }, { status: 400 });
        }

        const oldPlanId = member.planId;

        // Step 3: Update member using ledger billing logic
        member.planId = new mongoose.Types.ObjectId(planId);
        member.rent_amount = plan.price;

        let currentBalance = member.balance + paid;
        let nextDue = new Date(member.due_date);

        while (currentBalance >= member.rent_amount) {
            currentBalance -= member.rent_amount;
            nextDue.setMonth(nextDue.getMonth() + 1);
        }

        member.balance = currentBalance;
        member.due_date = nextDue;
        member.paymentMode = paymentMode || "cash";
        member.isActive = true;
        member.status = "active";
        await member.save({ session });

        // Step 4: Create payment + renewal record + analytics (all atomic)
        const renewalDate = new Date(); // event date: renewal happens now
        const yearMonth = `${renewalDate.getFullYear()}-${String(renewalDate.getMonth() + 1).padStart(2, "0")}`;

        await HostelPayment.create([{
            hostelId,
            memberId: member._id,
            planId: new mongoose.Types.ObjectId(planId),
            amount: paid,
            paymentMethod: paymentMode || "cash",
            transactionId,
            notes,
            status: "success",
            paymentType: "renewal",
            idempotencyKey,
        }], { session });

        await HostelAnalytics.updateOne(
            { hostelId, yearMonth },
            { $inc: { totalIncome: paid } },
            { session, upsert: true }
        );

        await HostelRenewal.create([{
            hostelId,
            memberId: member._id,
            oldPlanId,
            newPlanId: new mongoose.Types.ObjectId(planId),
            paidAmount: paid,
            paymentMode: paymentMode || "cash",
            transactionId,
            notes,
            renewedBy: token.email as string,
            idempotencyKey,
        }], { session });

        const createdByName = (token.name || token.email || "Admin") as string;
        await HostelPaymentLog.create([{
            hostelId,
            memberId: member.memberId,
            memberName: member.name,
            amount: paid,
            paymentType: "renewal",
            payment_date: renewalDate,
            createdBy: createdByName,
        }], { session });

        await session.commitTransaction();

        const updated = await HostelMember.findById(member._id).populate("planId", "name durationDays price").lean();
        return NextResponse.json({ success: true, member: updated });
    } catch (error: any) {
        if (session) await session.abortTransaction();
        if (error?.code === 11000 && error?.keyPattern?.idempotencyKey) {
            return NextResponse.json({ message: "Duplicate renewal requested", success: true }, { status: 200 });
        }
        console.error("[POST /api/hostel/members/[id]/renew]", error);
        return NextResponse.json({ error: error?.message || "Renewal failed" }, { status: 500 });
    } finally {
        if (session) session.endSession();
    }
}
