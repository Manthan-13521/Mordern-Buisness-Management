import { NextResponse } from "next/server";
import { resolveUser, AuthUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";


export const dynamic = "force-dynamic"; // M-7 FIX: Never cache this route — auth-gated sensitive data

export async function GET(req: Request) {
    try {
        const user = await resolveUser(req);
        if (!user || user.role !== "superadmin") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 }); // Prevent unauthorized access
        }

        await dbConnect();

        const { Organization } = await import("@/models/Organization");
        const { SaaSPlan } = await import("@/models/SaaSPlan");
        const { OrgSubscription } = await import("@/models/OrgSubscription");
        const { BillingLog } = await import("@/models/BillingLog");
        const { SubscriptionPaymentLog } = await import("@/models/SubscriptionPaymentLog");
        const { ReferralCode } = await import("@/models/ReferralCode");
        const { ReferralUsage } = await import("@/models/ReferralUsage");
        const { Pool } = await import("@/models/Pool");
        const { Hostel } = await import("@/models/Hostel");
        const { Business } = await import("@/models/Business");
        const { Member } = await import("@/models/Member");

        const now = new Date();
        const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // ── Run all aggregations in parallel ──────────────────────────────────
        const [
            allOrgs,
            totalPools,
            totalHostels,
            totalBusinesses,
            totalMembers,
            billingLogs,
            subscriptionPaymentLogs,
            referralCodes,
            referralUsages,
            dailySignups,
        ] = await Promise.all([
            Organization.find({}).populate("planId").lean(),
            Pool.countDocuments({}),
            Hostel.countDocuments({}),
            Business.countDocuments({}),
            Member.countDocuments({}),
            BillingLog.find({}).populate("orgId").sort({ createdAt: -1 }).limit(500).lean(),
            SubscriptionPaymentLog.find({ status: "success" }).sort({ createdAt: -1 }).limit(500).lean(),
            ReferralCode.find({}).lean(),
            ReferralUsage.find({}).lean(),
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

        // ── Map UserID to Org for subscription logs ──────────────────────────
        const userToOrgMap: Record<string, any> = {};
        allOrgs.forEach((o: any) => {
            if (o.ownerId) userToOrgMap[o.ownerId.toString()] = o;
        });

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
        const totalEverTrial = allOrgs.length;
        const convertedToPaid = allOrgs.filter((o: any) => o.status === "active").length;
        const conversionRate = totalEverTrial > 0 ? Math.round((convertedToPaid / totalEverTrial) * 100) : 0;

        // Helper to get primary entity ID (POOL001, HOST001, BIZ001) from organization
        const getEntityId = (o: any) => {
            if (!o) return "N/A";
            return o.poolIds?.[0] || o.hostelIds?.[0] || o.businessIds?.[0] || "N/A";
        };

        // ── Merge billing logs from both sources for complete billing view ────
        // Normalize SubscriptionPaymentLog entries to BillingLog shape
        const normalizedSubLogs = subscriptionPaymentLogs.map((s: any) => {
            const org = userToOrgMap[s.userId?.toString()];
            return {
                _id: s._id,
                orgId: org?._id || s.userId, // Use org._id (NOT userId) so dedup works
                orgName: org?.name || "Unknown Entity",
                entityId: getEntityId(org),
                amount: s.amount,
                method: "razorpay",
                paymentMode: "Razorpay",
                periodStart: s.createdAt,
                periodEnd: s.createdAt, // subscription logs don't have period end
                createdAt: s.createdAt,
                source: "subscription",
                module: s.module,
                planType: s.planType,
            };
        });

        // Deduplicate: if a BillingLog already exists for the same org on the same day, skip the sub log.
        // Both sides now use org ObjectId for consistent comparison.
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

        // Combine and sort by date
        const allBillingLogs = [
            ...billingLogs.map((b: any) => ({ 
                ...b, 
                orgName: b.orgId?.name || "Unknown Business",
                entityId: getEntityId(b.orgId)
            })), 
            ...uniqueSubLogs
        ].sort(
            (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        // ── Derive KPIs from deduplicated billing list (single source of truth) ─
        const totalRevenue = allBillingLogs.reduce((sum: number, b: any) => sum + (b.amount || 0), 0);
        const mrr = allBillingLogs
            .filter((b: any) => new Date(b.createdAt) >= thirtyDaysAgo)
            .reduce((sum: number, b: any) => sum + (b.amount || 0), 0);

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

            // Get revenue for this org from all billing sources
            const orgBilling = allBillingLogs.filter((b: any) => b.orgId?.toString() === o._id?.toString());
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
                totalBusinesses,
                totalMembers,
                conversionRate,
            },
            orgHealth,
            referralIntel,
            billingLogs: allBillingLogs,
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
