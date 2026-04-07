import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic"; // M-7 FIX: Never cache this route — auth-gated sensitive data

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || (session.user as any).role !== "superadmin") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 }); // Prevent unauthorized access
        }

        await dbConnect();

        const { Organization } = await import("@/models/Organization");
        const { OrgSubscription } = await import("@/models/OrgSubscription");
        const { BillingLog } = await import("@/models/BillingLog");
        const { ReferralCode } = await import("@/models/ReferralCode");
        const { ReferralUsage } = await import("@/models/ReferralUsage");
        const { Pool } = await import("@/models/Pool");
        const { Hostel } = await import("@/models/Hostel");
        const { Member } = await import("@/models/Member");

        const now = new Date();
        const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // ── Run all aggregations in parallel ──────────────────────────────────
        const [
            allOrgs,
            totalPools,
            totalHostels,
            totalMembers,
            billingLogs,
            referralCodes,
            referralUsages,
            revenueAgg,
            mrrAgg,
            dailySignups,
        ] = await Promise.all([
            Organization.find({}).populate("planId").lean(),
            Pool.countDocuments({}),
            Hostel.countDocuments({}),
            Member.countDocuments({}),
            BillingLog.find({}).sort({ createdAt: -1 }).limit(50).lean(),
            ReferralCode.find({}).lean(),
            ReferralUsage.find({}).lean(),
            // Total SaaS Revenue (all time)
            BillingLog.aggregate([
                { $group: { _id: null, total: { $sum: "$amount" } } }
            ]),
            // MRR — Revenue from billing logs created in the last 30 days
            BillingLog.aggregate([
                { $match: { createdAt: { $gte: thirtyDaysAgo } } },
                { $group: { _id: null, total: { $sum: "$amount" } } }
            ]),
            // Daily signups in last 30 days
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

        // ── Derive KPIs ──────────────────────────────────────────────────────
        const totalRevenue = revenueAgg[0]?.total || 0;
        const mrr = mrrAgg[0]?.total || 0;

        const activeOrgs = allOrgs.filter((o: any) => o.status === "active");
        const trialOrgs = allOrgs.filter((o: any) => o.status === "trial");
        const expiredOrgs = allOrgs.filter((o: any) => o.status === "expired");

        // Expiring soon: trial ending in <2 days OR subscription ending in <2 days
        const expiringSoon = allOrgs.filter((o: any) => {
            if (o.status === "trial" && o.trialEndsAt && new Date(o.trialEndsAt) <= twoDaysFromNow && new Date(o.trialEndsAt) > now) return true;
            if (o.status === "active" && o.currentPeriodEnd && new Date(o.currentPeriodEnd) <= twoDaysFromNow && new Date(o.currentPeriodEnd) > now) return true;
            return false;
        });

        // Conversion rate: paid / trial (using allOrgs to capture total historical funnel)
        const totalEverTrial = allOrgs.length; // everyone starts as trial or direct
        const convertedToPaid = allOrgs.filter((o: any) => o.status === "active").length;
        const conversionRate = totalEverTrial > 0 ? Math.round((convertedToPaid / totalEverTrial) * 100) : 0;

        // ── Organization Health Table ─────────────────────────────────────────
        const orgHealth = allOrgs.map((o: any) => {
            let risk: "green" | "yellow" | "red" = "green";
            if (o.status === "expired") risk = "red";
            else if (o.status === "trial") {
                if (o.trialEndsAt && new Date(o.trialEndsAt) <= twoDaysFromNow) risk = "red";
                else risk = "yellow";
            } else if (o.status === "active" && o.currentPeriodEnd && new Date(o.currentPeriodEnd) <= twoDaysFromNow) {
                risk = "yellow";
            }

            // Get revenue for this org
            const orgBilling = billingLogs.filter((b: any) => b.orgId?.toString() === o._id?.toString());
            const orgRevenue = orgBilling.reduce((sum: number, b: any) => sum + (b.amount || 0), 0);

            return {
                _id: o._id,
                name: o.name,
                plan: o.planId?.name || "No Plan",
                status: o.status,
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
        referralUsages.forEach((u: any) => {
            if (!usageByCode[u.code]) usageByCode[u.code] = { uses: 0, discountTotal: 0 };
            usageByCode[u.code].uses += 1;
            usageByCode[u.code].discountTotal += u.discountApplied || 0;
        });

        // Revenue generated per code: sum of billing from orgs that used this code
        const revenueByCode: Record<string, number> = {};
        allOrgs.forEach((o: any) => {
            if (o.referralCodeUsed) {
                const orgBilling = billingLogs.filter((b: any) => b.orgId?.toString() === o._id?.toString());
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
        if (expiringSoon.length > 0) {
            alerts.push({ type: "warning", message: `${expiringSoon.length} org(s) expiring within 2 days` });
        }
        if (expiredOrgs.length > 0) {
            alerts.push({ type: "danger", message: `${expiredOrgs.length} org(s) currently expired` });
        }
        const deadCodes = referralIntel.filter(r => r.isDead);
        if (deadCodes.length > 0) {
            alerts.push({ type: "info", message: `${deadCodes.length} referral code(s) with zero conversions` });
        }

        return NextResponse.json({
            kpis: {
                totalRevenue,
                mrr,
                activeOrgs: activeOrgs.length,
                trialOrgs: trialOrgs.length,
                expiringSoon: expiringSoon.length,
                expiredOrgs: expiredOrgs.length,
                totalPools,
                totalHostels,
                totalMembers,
                conversionRate,
            },
            orgHealth,
            referralIntel,
            billingLogs: billingLogs.slice(0, 20),
            dailySignups,
            alerts,
        }, {
            // M-7 FIX: private = browser can cache but CDN/proxy cannot.
            // Prevents sensitive revenue data leaking via shared cache.
            headers: { "Cache-Control": "private, max-age=30, must-revalidate" }
        });

    } catch (e) {
        console.error("[SuperAdmin Dashboard API]", e);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
