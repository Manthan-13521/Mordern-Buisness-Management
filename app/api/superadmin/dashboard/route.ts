import { NextResponse } from "next/server";
import { resolveUser, AuthUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";
import { getEcosystemSnapshot } from "@/lib/services/analyticsService";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    try {
        const user = await resolveUser(req);
        if (!user || user.role !== "superadmin") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await dbConnect();

        const { BillingLog } = await import("@/models/BillingLog");
        const { SubscriptionPaymentLog } = await import("@/models/SubscriptionPaymentLog");
        const { ReferralCode } = await import("@/models/ReferralCode");
        const { ReferralUsage } = await import("@/models/ReferralUsage");
        const { User } = await import("@/models/User");
        const { SaaSPlan } = await import("@/models/SaaSPlan");
        const { OrgSubscription } = await import("@/models/OrgSubscription");
        const { Organization } = await import("@/models/Organization");

        const now = new Date();
        const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // ── Single Source of Truth: Ecosystem Snapshot ─────────────────────────
        const snapshot = await getEcosystemSnapshot();
        const { kpis, validatedOrgs: allOrgs, activePoolIds, activeHostelIds, activeBusinessIds } = snapshot;

        // ── Fetch billing, referral, and signup data in parallel ───────────────
        const [
            billingLogs,
            subscriptionPaymentLogs,
            referralCodes,
            referralUsages,
            dailySignups,
        ] = await Promise.all([
            BillingLog.find({}).populate("orgId").sort({ createdAt: -1 }).limit(500).lean(),
            SubscriptionPaymentLog.find({ status: "success" }).sort({ createdAt: -1 }).limit(500).lean(),
            ReferralCode.find({}).lean(),
            ReferralUsage.aggregate([
                {
                    $group: {
                        _id: "$code",
                        uses: { $sum: 1 },
                        discountTotal: { $sum: "$discountApplied" }
                    }
                }
            ]),
            Organization.aggregate([
                { $match: { createdAt: { $gte: thirtyDaysAgo } } },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
            ])
        ]);

        // ── Map UserID to Org for subscription logs ──────────────────────────
        const userToOrgMap: Record<string, any> = {};
        allOrgs.forEach((o: any) => {
            if (o.ownerId) userToOrgMap[o.ownerId.toString()] = o;
        });

        // Helper to get primary entity ID from organization
        const getEntityId = (o: any) => {
            if (!o) return "N/A";
            return o.poolIds?.[0] || o.hostelIds?.[0] || o.businessIds?.[0] || "N/A";
        };

        // ── Merge billing logs from both sources for complete billing view ────
        const normalizedSubLogs = subscriptionPaymentLogs.map((s: any) => {
            const org = userToOrgMap[s.userId?.toString()];
            return {
                _id: s._id,
                orgId: org?._id || s.userId,
                orgName: org?.name || "Unknown Entity",
                entityId: getEntityId(org),
                amount: s.amount,
                method: "razorpay",
                paymentMode: "Razorpay",
                periodStart: s.createdAt,
                periodEnd: s.createdAt,
                createdAt: s.createdAt,
                source: "subscription",
                module: s.module,
                planType: s.planType,
                referralCodeUsed: org?.referralCodeUsed || null,
                discountApplied: org?.discountApplied || 0,
            };
        });

        // Deduplicate billing logs
        const billingDedup = new Set(
            billingLogs.map((b: any) => {
                const orgIdStr = b.orgId?._id?.toString() || b.orgId?.toString();
                const dateStr = new Date(b.createdAt).toISOString().slice(0, 10);
                return `${orgIdStr}_${dateStr}`;
            })
        );
        const uniqueSubLogs = normalizedSubLogs.filter((s: any) => {
            const key = `${s.orgId?.toString()}_${new Date(s.createdAt).toISOString().slice(0, 10)}`;
            return !billingDedup.has(key);
        });

        const allBillingLogs = [
            ...billingLogs.map((b: any) => ({ 
                ...b, 
                orgName: b.orgId?.name || "Unknown Business",
                entityId: getEntityId(b.orgId),
                referralCodeUsed: b.orgId?.referralCodeUsed || null,
                discountApplied: b.orgId?.discountApplied || 0,
            })), 
            ...uniqueSubLogs
        ].sort(
            (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );

        // Mark renewals
        const orgPaymentCounts: Record<string, number> = {};
        allBillingLogs.forEach(b => {
            const orgIdStr = b.orgId?._id?.toString() || b.orgId?.toString() || b.userId?.toString();
            if (!orgIdStr) return;
            orgPaymentCounts[orgIdStr] = (orgPaymentCounts[orgIdStr] || 0) + 1;
            b.isRenewal = orgPaymentCounts[orgIdStr] > 1;
        });

        // Re-sort descending for the frontend
        allBillingLogs.sort(
            (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        // ── Revenue KPIs from deduplicated billing ────────────────────────────
        const totalRevenue = allBillingLogs.reduce((sum: number, b: any) => sum + (b.amount || 0), 0);
        const mrr = allBillingLogs
            .filter((b: any) => new Date(b.createdAt) >= thirtyDaysAgo)
            .reduce((sum: number, b: any) => sum + (b.amount || 0), 0);

        // ── Organization Health Table (display only, no recalculation) ────────
        const orgHealth = allOrgs.map((o: any) => {
            let displayStatus = o.status;
            if ((o.status === "active" || o.status === "trial") && !o._isEffectivelyActive) {
                displayStatus = "inactive";
            }

            let risk: "green" | "yellow" | "red" = "green";
            if (displayStatus === "expired" || displayStatus === "inactive") risk = "red";
            else if (displayStatus === "trial") {
                if (o.trialEndsAt && new Date(o.trialEndsAt) <= twoDaysFromNow) risk = "red";
                else risk = "yellow";
            } else if (displayStatus === "active" && o.currentPeriodEnd && new Date(o.currentPeriodEnd) <= twoDaysFromNow) {
                risk = "yellow";
            }

            const orgBilling = allBillingLogs.filter((b: any) => b.orgId?.toString() === o._id?.toString());
            const orgRevenue = orgBilling.reduce((sum: number, b: any) => sum + (b.amount || 0), 0);

            return {
                _id: o._id,
                name: o.name,
                plan: o.planId?.name || "No Plan",
                status: displayStatus,
                revenue: orgRevenue,
                risk,
                trialEndsAt: o.trialEndsAt,
                currentPeriodEnd: o.currentPeriodEnd,
                referralCodeUsed: o.referralCodeUsed || null,
                discountApplied: o.discountApplied || 0
            };
        });

        // ── Referral Intelligence ─────────────────────────────────────────────
        const usageByCode: Record<string, { uses: number; discountTotal: number }> = {};
        referralUsages.forEach((s: any) => {
            usageByCode[s._id] = { uses: s.uses, discountTotal: s.discountTotal };
        });

        const revenueByCode: Record<string, number> = {};
        allOrgs.forEach((o: any) => {
            if (o.referralCodeUsed) {
                const orgBilling = allBillingLogs.filter((b: any) => b.orgId?.toString() === o._id?.toString());
                const orgRev = orgBilling.reduce((sum: number, b: any) => sum + (b.amount || 0), 0);
                revenueByCode[o.referralCodeUsed] = (revenueByCode[o.referralCodeUsed] || 0) + orgRev;
            }
        });

        const referralIntel = referralCodes.map((c: any) => {
            const stats = usageByCode[c.code] || { uses: 0, discountTotal: 0 };
            const revenue = revenueByCode[c.code] || 0;
            const netProfit = revenue - stats.discountTotal;

            return {
                _id: c._id,
                code: c.code,
                discountType: c.discountType,
                discountValue: c.discountValue,
                maxUses: c.maxUses,
                usedCount: c.usedCount,
                actualUses: stats.uses,
                isActive: c.isActive,
                expiresAt: c.expiresAt,
                discountLoss: stats.discountTotal,
                revenueGenerated: revenue,
                netProfit,
                isDead: stats.uses === 0 && c.isActive,
                isHighROI: netProfit > 0 && stats.uses > 0,
            };
        });

        referralIntel.sort((a, b) => b.actualUses - a.actualUses);

        // ── Alerts ────────────────────────────────────────────────────────────
        const alerts: { type: "warning" | "danger" | "info"; message: string }[] = [];
        if (kpis.expiringSoon > 0) {
            alerts.push({ type: "warning", message: `${kpis.expiringSoon} org(s) expiring within 2 days` });
        }
        if (kpis.expiredOrgs > 0) {
            alerts.push({ type: "danger", message: `${kpis.expiredOrgs} org(s) currently expired` });
        }
        const deadCodes = referralIntel.filter(r => r.isDead);
        if (deadCodes.length > 0) {
            alerts.push({ type: "info", message: `${deadCodes.length} referral code(s) with zero conversions` });
        }

        return NextResponse.json({
            kpis: {
                totalRevenue,
                mrr,
                activeOrgs: kpis.activeOrgs,
                trialOrgs: kpis.trialOrgs,
                expiringSoon: kpis.expiringSoon,
                expiredOrgs: kpis.expiredOrgs,
                totalPools: kpis.totalPools,
                totalHostels: kpis.totalHostels,
                totalBusinesses: kpis.totalBusinesses,
                totalMembers: kpis.totalMembers,
                conversionRate: kpis.conversionRate,
            },
            orgHealth,
            referralIntel,
            billingLogs: allBillingLogs,
            dailySignups,
            alerts,
        }, {
            headers: { "Cache-Control": "private, max-age=30, must-revalidate" }
        });

    } catch (e) {
        console.error("[SuperAdmin Dashboard API]", e);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
