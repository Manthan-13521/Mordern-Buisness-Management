import { NextResponse } from "next/server";
import { resolveUser, AuthUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";
import { Payment } from "@/models/Payment";
import { Member } from "@/models/Member";

import mongoose from "mongoose";
import { PaymentSchema } from "@/lib/validators";
import { logger } from "@/lib/logger";
import { getTenantFilter, resolvePoolId } from "@/lib/tenant";

export const dynamic = "force-dynamic";

/**
 * GET /api/payments
 * Returns paginated payments for the admin's pool.
 * Supports: ?page=1&limit=20&memberId=<id>&method=cash|upi|razorpay_online
 */
export async function GET(req: Request) {
    try {
        const [, user] = await Promise.all([
            dbConnect(),
            resolveUser(req),
        ]);
        if (!user)
            return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });

        const url = new URL(req.url);
        const page  = Math.max(1, parseInt(url.searchParams.get("page")  ?? "1"));
        const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "20")));
        const skip  = (page - 1) * limit;

        const query: Record<string, unknown> = {};

        // ── Tenant isolation: non-superadmin MUST have poolId ─────────────────
        if (user.role !== "superadmin" && !user.poolId) {
            return NextResponse.json({ error: "No pool assigned to this account" }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }
        const tenantFilter = getTenantFilter(user);
        Object.assign(query, tenantFilter);

        // Optional filters
        const memberIdParam = url.searchParams.get("memberId");
        if (memberIdParam) query.memberId = new mongoose.Types.ObjectId(memberIdParam);

        const methodParam = url.searchParams.get("method");
        if (methodParam) query.paymentMethod = methodParam;

        const statusParam = url.searchParams.get("status");
        if (statusParam) query.status = statusParam;

        const archivedParam = url.searchParams.get("archived");
        if (archivedParam === "true") {
            query.isArchived = true;
        } else {
            query.isArchived = { $ne: true };
            query.isDeleted = { $ne: true };
        }

        const memberTypeParam = url.searchParams.get("type");
        if (memberTypeParam === "member") {
            query.memberCollection = "members";
        } else if (memberTypeParam === "entertainment") {
            query.memberCollection = "entertainment_members";
        }

        const [payments, total] = await Promise.all([
            Payment.find(query)
                .populate("memberId", "name memberId")
                .populate("planId",   "name")
                .populate("recordedBy", "name")
                .sort({ createdAt: -1, _id: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Payment.countDocuments(query),
        ]);

        const headers: Record<string, string> = process.env.NODE_ENV === "development"
            ? { "Cache-Control": "no-store, no-cache, must-revalidate, private" }
            : {};

        return NextResponse.json({
            success: true,
            data: payments,
            meta: {
                stable: true,
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            }
        }, { headers });
    } catch (error) {
        console.error("[GET /api/payments]", error);
        return NextResponse.json({ error: "Failed to fetch payments" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}

/**
 * POST /api/payments
 * Records a manual payment and updates member balance.
 * Idempotency: pass `idempotencyKey` to prevent duplicate submissions.
 */
export async function POST(req: Request) {
    try {
        const [, user] = await Promise.all([
            dbConnect(),
            resolveUser(req),
        ]);
        if (!user)
            return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });

        const body = await req.json();
        const result = PaymentSchema.safeParse(body);
        if (!result.success) {
            const errs = result.error.flatten().fieldErrors;
            const errMsg = Object.entries(errs).map(([f, m]) => `${f}: ${(m as string[])?.join(", ")}`).join(" | ") || result.error.flatten().formErrors?.join(", ") || "Validation failed";
            return NextResponse.json({ error: errMsg }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }
        
        const {
            memberId,
            planId,
            amount,
            paymentMethod,
            transactionId,
            notes,
            idempotencyKey,
            clientId,
            memberCollection,
        } = result.data;
        if (paymentMethod === "upi" && !transactionId) {
            return NextResponse.json({ error: "UPI payments require a transactionId" }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        const poolId = resolvePoolId(user, body.poolId);
        
        // --- STEP 12 SaaS Gating: Hard Kill Switch ---
        // C-7 FIX: Offline payment syncs (identified by clientId) bypass the kill switch.
        // Rationale: Money was already physically collected offline. Blocking the sync
        // would cause real financial data loss — the worst possible outcome.
        // Only block NEW online payments when subscription is hard-expired.
        const isOfflineSync = !!clientId;
        if (!isOfflineSync) {
            try {
                const { enforceWriteAccess } = await import("@/lib/saasGuard");
                await enforceWriteAccess(poolId);
            } catch (e: any) {
                if (e.message === "SaaS_Subscription_Expired") {
                    return NextResponse.json({ error: "SaaS Subscription expired. Please renew to process payments." }, {  status: 403 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
                }
            }
        }
        // ---------------------------------------------

        // ── STEP 4: Server Rule Idempotency & Deduplication ────────────────────────────────
        if (clientId || idempotencyKey) {
            try {
                // If both are present, we look for an exact match.
                // If only one is present, we fallback to finding any payment with that key.
                const query: any = { poolId };
                if (clientId && idempotencyKey) {
                    query.clientId = clientId;
                    query.idempotencyKey = idempotencyKey;
                } else if (clientId) {
                    query.clientId = clientId;
                } else if (idempotencyKey) {
                    query.idempotencyKey = idempotencyKey;
                }

                const existing = await Payment.findOne(query).lean();
                if (existing) {
                    logger.audit({
                        type: "PAYMENT_DUPLICATE",
                        userId: user.id,
                        meta: { clientId, idempotencyKey, existingPaymentId: (existing as any)._id },
                    });
                    console.log("Duplicate prevented", { clientId, idempotencyKey });
                    return NextResponse.json({ message: "Duplicate request — payment already recorded.", payment: existing }, {  status: 200 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
                }
            } catch (err) {
                console.warn("Deduplication pre-check failed:", err);
            }
        }

        // Server-Side Hard Verification Rule
        const safeAmount = Math.min(Number(amount), 9999999999);
        if (!Number.isFinite(safeAmount) || safeAmount < 0) {
            return NextResponse.json({ error: "Invalid structural numeric amount sent by client." }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        if (planId) {
            const { Plan } = await import("@/models/Plan");
            const plan = await Plan.findOne({ _id: planId, poolId }).lean();
            if (plan && safeAmount > (plan as any).price) {
                return NextResponse.json({ error: "Amount exceeds expected plan price parameters." }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
            }
        }

        // Record payment without transaction
        try {
            // ── Save payment ───────────────────────────────────────────────────
            let payment;
            try {
                payment = await Payment.create({
                    memberId:         new mongoose.Types.ObjectId(memberId as string),
                    planId:           new mongoose.Types.ObjectId(planId  as string),
                    poolId,
                    memberCollection,
                    amount:           safeAmount,
                    paymentMethod,
                    transactionId:    transactionId  || undefined,
                    notes:            notes          || undefined,
                    idempotencyKey:   idempotencyKey || undefined,
                    clientId:         clientId       || undefined,
                    recordedBy:       new mongoose.Types.ObjectId(user.id),
                    status:           "success",
                });
                
                logger.audit({
                    type: "PAYMENT_SUCCESS",
                    userId: user.id,
                    poolId: poolId,
                    ip: req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown",
                    meta: { amount: Number(amount), paymentMethod, memberId },
                });
            } catch (createErr: any) {
                // E11000: Duplicate key error (idempotency override caught by DB instead of check)
                if (createErr.code === 11000) {
                    const dedupKey = clientId || idempotencyKey;
                    if (dedupKey) {
                        const existing = await Payment.findOne({
                            poolId,
                            $or: [{ clientId: dedupKey }, { idempotencyKey: dedupKey }]
                        }).lean();
                        
                        if (existing) {
                            console.log("[Payment] Duplicate prevented", { clientId, idempotencyKey });
                            return NextResponse.json({ message: "Duplicate request — payment already recorded.", payment: existing }, {  status: 200 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
                        }
                    }
                }
                throw createErr;
            }

            // ── Real-Time Pool Analytics Update ────────────────────────────────
            const paymentDateStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
            const { PoolAnalytics } = await import("@/models/PoolAnalytics");
            await PoolAnalytics.findOneAndUpdate(
                { poolId, yearMonth: paymentDateStr },
                { $inc: { totalIncome: safeAmount } },
                { upsert: true }
            );

            // ── STEP 7C: Ledger Source of Truth Engine ──────────────────────────
            const { Ledger } = await import("@/models/Ledger");
            const memberObjId = new mongoose.Types.ObjectId(memberId as string);
            let ledger = await Ledger.findOne({ memberId: memberObjId });
            
            if (ledger) {
                ledger.totalPaid += safeAmount;
                ledger.balance = Math.max(0, ledger.totalDue - ledger.totalPaid); // Strict absolute recomputation
                ledger.creditBalance = Math.max(0, ledger.totalPaid - ledger.totalDue); // Store explicit overpayment
                await ledger.save();
            } else {
                // Auto-Migrate Legacy Un-ledgered Member seamlessly
                const fallbackMember = await Member.findById(memberObjId) 
                    || await import("@/models/EntertainmentMember").then(m => m.EntertainmentMember.findById(memberObjId));

                const legacyPaid = (fallbackMember as any)?.paidAmount || 0;
                const legacyBalance = (fallbackMember as any)?.balanceAmount || 0;
                const initialDueTarget = legacyPaid + legacyBalance;

                ledger = await Ledger.create({
                    memberId: memberObjId,
                    poolId,
                    totalDue: initialDueTarget,
                    totalPaid: legacyPaid + safeAmount,
                    balance: Math.max(0, initialDueTarget - (legacyPaid + safeAmount)),
                    creditBalance: Math.max(0, (legacyPaid + safeAmount) - initialDueTarget)
                });
            }

            // ── Sync Hybrid Cache visually onto Member Object ──────────────────
            let updatedMember = await Member.findOneAndUpdate(
                { _id: memberObjId },
                { $set: { balanceAmount: ledger.balance, paidAmount: ledger.totalPaid, cachedBalance: ledger.balance } },
                { returnDocument: 'after' }
            ) as any;

            if (!updatedMember) {
                const { EntertainmentMember } = await import("@/models/EntertainmentMember");
                updatedMember = await EntertainmentMember.findOneAndUpdate(
                    { _id: memberObjId },
                    { $set: { balanceAmount: ledger.balance, paidAmount: ledger.totalPaid, cachedBalance: ledger.balance } },
                    { returnDocument: 'after' }
                ) as any;
            }

            if (updatedMember) {
                // Visual bounds guard and status mapping cache
                updatedMember.paymentStatus = updatedMember.balanceAmount <= 0 ? "paid" : "partial";
                
                if (ledger.balance <= 0 && updatedMember.manualOverride !== true && updatedMember.accessStatus === "blocked") {
                    updatedMember.accessStatus = "active";
                    updatedMember.accessState = "active"; // 1.2 Access State Opt
                    const { AccessLog } = await import("@/models/AccessLog");
                    await AccessLog.create([{
                        memberId: memberObjId,
                        poolId,
                        action: "auto_unblock",
                        reason: "payment",
                        previousStatus: "blocked",
                        newStatus: "active"
                    }]);
                }

                await updatedMember.save({ validateModifiedOnly: true });
            }

            // ── Step 10: Fire-and-forget WhatsApp payment confirmation ──────
            if (updatedMember?.phone) {
                import("@/lib/notificationEngine").then(mod =>
                    mod.sendPaymentConfirmation({
                        memberId: updatedMember._id,
                        poolId,
                        memberName: updatedMember.name || "Member",
                        phone: updatedMember.phone,
                        amount: safeAmount,
                    }).catch(() => {})
                );
            }

            import("@/lib/events").then(mod => {
                mod.dispatchEvent("payment.received", { paymentId: payment._id, amount: safeAmount, memberId: memberObjId });
            }).catch(() => {});

            return NextResponse.json(payment, {  status: 201 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        } catch (trxError: any) {
            throw trxError;
        }
    } catch (error: any) {
        if (error?.code === 11000 && (error?.keyPattern?.idempotencyKey || error?.keyPattern?.clientId)) {
            const existing = await Payment.findOne({ 
                $or: [{ idempotencyKey: error.keyValue?.idempotencyKey }, { clientId: error.keyValue?.clientId }] 
            }).lean();
            return NextResponse.json({ message: "Duplicate request — payment already recorded.", payment: existing }, {  status: 200 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }
        console.error("[POST /api/payments]", error);
        return NextResponse.json({ error: "Server error recording payment" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}
