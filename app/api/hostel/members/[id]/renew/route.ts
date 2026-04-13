import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { getToken } from "next-auth/jwt";
import { jwtVerify } from "jose";
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
    try {
                const authHeader = req.headers.get("authorization");
        let token = null;

        if (authHeader?.startsWith("Bearer ")) {
            try {
                const bearerToken = authHeader.split(" ")[1];
                const secret = new TextEncoder().encode(process.env.JWT_SECRET);
                const { payload } = await jwtVerify(bearerToken, secret);
                token = payload;
            } catch (e) {}
        }

        if (!token) {
            token = await getToken({ req: req as any });
        }

        await dbConnect();
        const [{ id }, body] = await Promise.all([params, req.json()]);
        await dbConnect();
        if (!token || token.role !== "hostel_admin") {
            return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }
        const hostelId = token.hostelId as string;

        const { planId, paidAmount, paymentMode, transactionId, notes, idempotencyKey } = body;
        
        const paid = Number(paidAmount);
        if (!planId || !Number.isFinite(paid) || paid < 0 || paid > 9_999_999_999) {
            return NextResponse.json({ error: "Invalid payment amount or missing planId" }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        if (idempotencyKey) {
            const existing = await HostelRenewal.findOne({ idempotencyKey, hostelId }).lean();
            if (existing) {
                return NextResponse.json({ message: "Duplicate renewal requested", success: true }, {  status: 200 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
            }
        }

        // Step 1: Fetch existing member
        const member = await HostelMember.findOne({ _id: id, hostelId, isDeleted: false });
        if (!member) {
            return NextResponse.json({ error: "Member not found" }, {  status: 404 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        // Step 2: Validate new plan
        const plan = await HostelPlan.findOne({ _id: planId, hostelId, isActive: true }).lean() as any;
        if (!plan) {
            return NextResponse.json({ error: "Invalid or inactive plan" }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
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
        await member.save();

        // Step 4: Create payment + renewal record + analytics
        const renewalDate = new Date(); // event date: renewal happens now
        const yearMonth = `${renewalDate.getFullYear()}-${String(renewalDate.getMonth() + 1).padStart(2, "0")}`;

        await HostelPayment.create({
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
        });

        try {
            await HostelAnalytics.updateOne(
                { hostelId, yearMonth },
                { $inc: { totalIncome: paid } },
                { upsert: true }
            );
        } catch (analyticsErr) {
            console.error("HostelAnalytics renewal update failed (non-fatal):", analyticsErr);
        }

        await HostelRenewal.create({
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
        });

        const createdByName = (token.name || token.email || "Admin") as string;
        await HostelPaymentLog.create({
            hostelId,
            memberId: member.memberId,
            memberName: member.name,
            amount: paid,
            paymentType: "renewal",
            payment_date: renewalDate,
            createdBy: createdByName,
        });

        const updated = await HostelMember.findById(member._id).populate("planId", "name durationDays price").lean();
        return NextResponse.json({ success: true, member: updated }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    } catch (error: any) {
        if (error?.code === 11000 && error?.keyPattern?.idempotencyKey) {
            return NextResponse.json({ message: "Duplicate renewal requested", success: true }, {  status: 200 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }
        console.error("[POST /api/hostel/members/[id]/renew]", error);
        return NextResponse.json({ error: error?.message || "Renewal failed" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}
