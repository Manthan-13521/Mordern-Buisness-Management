import { NextResponse } from "next/server";
import { resolveUser, AuthUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";

import { redis } from "@/lib/redis";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    try {
        const [user, body] = await Promise.all([
            resolveUser(req),
            req.json()
        ]);

        // ── C-1 FIX: Hard auth guard — always required ─────────────────────
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }
        const isSuperAdmin = user.role === "superadmin";

        await dbConnect();

        const { SaaSPlan } = await import("@/models/SaaSPlan");
        const { Organization } = await import("@/models/Organization");
        const { OrgSubscription } = await import("@/models/OrgSubscription");

        const { orgId, planId, paymentMethod } = body;

        if (!orgId || !planId || !paymentMethod) {
            return NextResponse.json({ error: "orgId, planId and paymentMethod are required" }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        const [plan, org] = await Promise.all([
            SaaSPlan.findById(planId),
            Organization.findById(orgId),
        ]);
        if (!plan) return NextResponse.json({ error: "Plan not found" }, {  status: 404 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        if (!org) return NextResponse.json({ error: "Organization not found" }, {  status: 404 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });

        // ── C-1 FIX: Non-superadmins can only activate their own org ────────
        if (!isSuperAdmin) {
            const ownerId = org.ownerId?.toString();
            const userId = user.id;
            if (!ownerId || ownerId !== userId?.toString()) {
                return NextResponse.json({ error: "Forbidden: you can only manage your own organization" }, {  status: 403 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
            }
        }

        // ── M-6 FIX: Exact match on referral code — NO regex ───────────────
        const { referralCode } = body;
        let discountApplied = 0;
        let finalPrice = plan.price;
        let appliedCode: any = null;

        if (referralCode) {
            const { ReferralCode } = await import("@/models/ReferralCode");
            const sanitizedCode = String(referralCode).toUpperCase().trim();

            // ── C-2 FIX: Atomic increment — prevents race condition abuse ────
            // Only increments if code is valid and below maxUses. Returns null if exhausted.
            const atomicCode = await (ReferralCode as any).findOneAndUpdate(
                {
                    code: sanitizedCode,          // exact match, no regex
                    isActive: true,
                    $or: [
                        { maxUses: 0 },           // 0 = unlimited
                        { usedCount: { $lt: "$maxUses" } } // still has capacity
                    ]
                },
                { $inc: { usedCount: 1 } },
                { new: true }
            );

            // If null: code doesn't exist, is inactive, or is exhausted — check which
            if (!atomicCode) {
                // Distinguish between "doesn't exist" and "exhausted" for better UX
                const codeExists = await ReferralCode.findOne({ code: sanitizedCode }).lean();
                if (!codeExists) {
                    return NextResponse.json({ error: "Invalid referral code" }, {  status: 404 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
                }
                if (!(codeExists as any).isActive) {
                    return NextResponse.json({ error: "Referral code is inactive" }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
                }
                if ((codeExists as any).expiresAt && new Date() > (codeExists as any).expiresAt) {
                    return NextResponse.json({ error: "Referral code has expired" }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
                }
                return NextResponse.json({ error: "Referral code usage limit reached" }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
            }

            // Check expiry after atomic increment (undo if expired)
            if (atomicCode.expiresAt && new Date() > atomicCode.expiresAt) {
                // Undo the increment since code is expired
                await (ReferralCode as any).updateOne({ _id: atomicCode._id }, { $inc: { usedCount: -1 } });
                return NextResponse.json({ error: "Referral code has expired" }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
            }

            // Calculate discount
            if (atomicCode.discountType === "percentage") {
                discountApplied = Math.round((plan.price * atomicCode.discountValue) / 100);
            } else if (atomicCode.discountType === "flat") {
                discountApplied = atomicCode.discountValue;
            }
            finalPrice = Math.max(0, plan.price - discountApplied);
            appliedCode = atomicCode;
        }

        if (paymentMethod === "manual_upi") {
            const nextYear = new Date();
            nextYear.setFullYear(nextYear.getFullYear() + 1);

            // ── C-4 FIX: Upsert OrgSubscription — prevents duplicate on double-click ──
            const subscription = await (OrgSubscription as any).findOneAndUpdate(
                { orgId: org._id },
                {
                    $set: {
                        planId: plan._id,
                        status: "active",
                        startDate: new Date(),
                        nextBillingDate: nextYear,
                        lastPaymentId: "MANUAL_UPI_" + Date.now(),
                    }
                },
                { upsert: true, new: true }
            );

            // Update Org status
            org.status = "active";
            org.planId = plan._id;
            org.currentPeriodEnd = nextYear;
            if (appliedCode) {
                org.referralCodeUsed = appliedCode.code;
                org.discountApplied = discountApplied;
            }
            await org.save();

            // ── Prompt 0.4: Invalidate SaaS Guard Cache ──
            if (redis) {
                try {
                    const pools = org.poolIds || [];
                    for (const pid of pools) {
                        await redis.del(`saasGuard:orgContext:${pid}`);
                        await redis.del(`saasGuard:poolMap:${pid}`);
                    }
                    await redis.del(`org:${org._id}:plan`);
                    console.log(`[Cache] Invalidated SaaS Guard for Org: ${org._id} (${pools.length} pools)`);
                } catch (e) {
                    console.warn("[Cache] Failed to invalidate SaaS Guard:", e);
                }
            }

            // Billing log (always write, even if upsert — uniqueness enforced by clientId if needed)
            const { BillingLog } = await import("@/models/BillingLog");
            await BillingLog.create({
                orgId: org._id,
                amount: finalPrice,
                method: "upi",
                periodStart: new Date(),
                periodEnd: nextYear,
            });

            // Referral usage tracking (appliedCode already atomically incremented, just log usage)
            if (appliedCode) {
                const { ReferralUsage } = await import("@/models/ReferralUsage");
                // Upsert ReferralUsage to prevent duplicate logs on retry
                await (ReferralUsage as any).findOneAndUpdate(
                    { code: appliedCode.code, orgId: org._id },
                    { $setOnInsert: { code: appliedCode.code, orgId: org._id, discountApplied } },
                    { upsert: true }
                );
            }

            return NextResponse.json({ success: true, message: "Manual UPI Activated", subscription, finalPrice, discountApplied }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });

        } else if (paymentMethod === "razorpay") {
            // Phase 2 placeholder — wire in Razorpay SDK here
            return NextResponse.json({
                success: true,
                orderId: "order_PENDING_" + Date.now(),
                amount: finalPrice,
                discountApplied,
                currency: "INR",
            }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        return NextResponse.json({ error: "Invalid payment method" }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });

    } catch (e: any) {
        console.error("[Checkout] Error:", e);
        return NextResponse.json({ error: "Server error handling checkout" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}
