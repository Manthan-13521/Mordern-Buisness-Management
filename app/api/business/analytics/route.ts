import { NextResponse } from "next/server";
import { resolveUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";
import { BusinessTransaction } from "@/models/BusinessTransaction";
import { requireBusinessId } from "@/lib/tenant";
import { logger } from "@/lib/logger";
import {
    getRevenue,
    getReceivables,
    type DateRange,
} from "@/services/analyticsService";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    const start = Date.now();
    try {
        const user = await resolveUser(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        
        let businessId;
        try {
            businessId = requireBusinessId(user);
        } catch (err: any) {
            return NextResponse.json({ error: err.message }, { status: err.message === "Unauthorized" ? 401 : 403 });
        }

        // 🟠 DOUBLE DEFENSE: Explicit type and validity checks
        if (!businessId || typeof businessId !== "string") {
            throw new Error("Invalid businessId type or value");
        }
        if (businessId !== "superadmin" && businessId.trim() === "") {
            throw new Error("Invalid businessId format");
        }

        // Structured debug logging via pino
        if (process.env.DEBUG_ANALYTICS === "true") {
            logger.debug("Business analytics query", {
                businessId,
                userId: user.id,
                route: "/api/business/analytics",
            });
        }

        await dbConnect();

        // 🔴 TERMINAL DEFENSE: Failsafe check before query execution
        if (!businessId) {
            throw new Error("Tenant context lost before query execution");
        }

        // ═══════════════════════════════════════════════════════════════════
        // USE CENTRALIZED ANALYTICS SERVICE — Single Source of Truth
        // Revenue = SALE + sent ONLY (not all sales!)
        // ═══════════════════════════════════════════════════════════════════
        const [
            dailyRevenue,
            monthlyRevenue,
            yearlyRevenue,
            receivables,
            recentSalesRaw,
            recentPaymentsRaw
        ] = await Promise.all([
            getRevenue(businessId, "daily"),
            getRevenue(businessId, "monthly"),
            getRevenue(businessId, "yearly"),
            getReceivables(businessId),
            BusinessTransaction.find({ businessId, category: 'SALE', transactionType: 'sent' })
                .populate("customerId", "name")
                .select("customerId amount paidAmount date transactionType items category createdAt")
                .sort({ date: -1 })
                .limit(5)
                .lean(),
            BusinessTransaction.find({ businessId, category: 'PAYMENT' })
                .populate("customerId", "name")
                .select("customerId amount date transactionType paymentMethod category createdAt")
                .sort({ date: -1 })
                .limit(5)
                .lean()
        ]);

        // 🟠 AGGREGATION SAFETY: Fallback for Mongo structure quirks
        const recentSales = Array.isArray(recentSalesRaw) ? recentSalesRaw : [];
        const recentPayments = Array.isArray(recentPaymentsRaw) ? recentPaymentsRaw : [];

        const hasNoData = recentSales.length === 0 && recentPayments.length === 0;

        // Performance tracking via structured logger
        if (process.env.DEBUG_ANALYTICS === "true") {
            logger.debug("Analytics performance", {
                businessId,
                duration: Date.now() - start,
                dailySales: dailyRevenue.total,
                monthlySales: monthlyRevenue.total,
                yearlySales: yearlyRevenue.total,
                dailyTxCount: dailyRevenue.transactionCount,
                monthlyTxCount: monthlyRevenue.transactionCount,
                yearlyTxCount: yearlyRevenue.transactionCount,
            });
        }

        return NextResponse.json({
            data: {
                stats: {
                    dailySales: dailyRevenue.total,
                    monthlySales: monthlyRevenue.total,
                    yearlySales: yearlyRevenue.total,
                    totalDue: receivables.totalReceivables
                },
                recentSales,
                recentPayments
            },
            meta: {
                message: hasNoData ? "No data for this tenant" : "Analytics fetched successfully",
                businessId,
                timestamp: new Date().toISOString()
            }
        }, {
            headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" }
        });
    } catch (error: any) {
        logger.error("Analytics error", { error: error.message, duration: Date.now() - start });
        return NextResponse.json({ 
            data: null,
            meta: {
                error: "Failed to fetch analytics",
                details: error.message,
                duration: Date.now() - start,
                timestamp: new Date().toISOString()
            }
        }, { status: 500 });
    }
}
