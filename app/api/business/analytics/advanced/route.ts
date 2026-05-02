import { NextResponse } from "next/server";
import { resolveUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";
import { BusinessTransaction } from "@/models/BusinessTransaction";
import { BusinessCustomer } from "@/models/BusinessCustomer";
import { requireBusinessId } from "@/lib/tenant";
import {
    getRevenueForDateRange,
    getReceivables,
    getCashFlow,
    getLocalDateBounds,
} from "@/services/analyticsService";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
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

        if (!businessId || typeof businessId !== "string") {
            throw new Error("Invalid businessId type or value");
        }

        await dbConnect();

        const { searchParams } = new URL(req.url);
        const rawTimeframe = searchParams.get("timeframe") || "30d";
        const timeframe = ["7d", "30d", "yearly"].includes(rawTimeframe) ? rawTimeframe : "30d";

        const now = new Date();
        let startDate = new Date();
        if (timeframe === "7d") {
            startDate.setDate(now.getDate() - 7);
        } else if (timeframe === "30d") {
            startDate.setDate(now.getDate() - 30);
        } else if (timeframe === "yearly") {
            startDate.setFullYear(now.getFullYear() - 1);
        }

        // ═══════════════════════════════════════════════════════════════════
        // 1. BUSINESS SUMMARY — Using centralized service for consistency
        // Revenue = SALE + sent ONLY | Expenses = SALE + received ONLY
        // ═══════════════════════════════════════════════════════════════════
        const [summary, cashFlowData, customerBalances] = await Promise.all([
            getRevenueForDateRange(businessId, startDate, now),
            getCashFlow(businessId, timeframe === "7d" ? "daily" : timeframe === "30d" ? "monthly" : "yearly"),
            getReceivables(businessId),
        ]);

        const netProfit = summary.revenue - summary.expenses;

        const businessSummary = {
            totalRevenue: summary.revenue,
            totalExpenses: summary.expenses,
            netProfit,
            totalReceivables: customerBalances.totalReceivables,
            totalPayables: customerBalances.totalPayables,
            currentCashFlow: cashFlowData.netCashFlow,
            cashIn: cashFlowData.cashIn,
            cashOut: cashFlowData.cashOut
        };

        // Debug logging
        if (process.env.DEBUG_ANALYTICS === "true") {
            console.info(JSON.stringify({
                type: "ADVANCED_ANALYTICS_SUMMARY",
                businessId,
                timeframe,
                startDate: startDate.toISOString(),
                endDate: now.toISOString(),
                revenue: summary.revenue,
                expenses: summary.expenses,
                netProfit,
                cashIn: cashFlowData.cashIn,
                cashOut: cashFlowData.cashOut,
                timestamp: new Date().toISOString()
            }));
        }

        // ═══════════════════════════════════════════════════════════════════
        // 2. TIME-BASED TRENDS
        // Uses same SALE+sent / SALE+received rule for consistency
        // ═══════════════════════════════════════════════════════════════════
        const dateFilter = { businessId, date: { $gte: startDate } };
        const groupByFormat = timeframe === "yearly" ? "%Y-%m" : "%Y-%m-%d";
        
        const trendData = await BusinessTransaction.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: { $dateToString: { format: groupByFormat, date: "$date" } },
                    revenue: {
                        $sum: { $cond: [{ $and: [{ $eq: ["$category", "SALE"] }, { $eq: ["$transactionType", "sent"] }] }, "$amount", 0] }
                    },
                    expenses: {
                        $sum: { $cond: [{ $and: [{ $eq: ["$category", "SALE"] }, { $eq: ["$transactionType", "received"] }] }, "$amount", 0] }
                    }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // ═══════════════════════════════════════════════════════════════════
        // 3. YEARLY REPORT (Jan-Dec) — Same revenue rule
        // ═══════════════════════════════════════════════════════════════════
        const currentYearStart = new Date(now.getFullYear(), 0, 1);
        const yearlyReportRaw = await BusinessTransaction.aggregate([
            { $match: { businessId, date: { $gte: currentYearStart } } },
            {
                $group: {
                    _id: { $month: "$date" },
                    revenue: {
                        $sum: { $cond: [{ $and: [{ $eq: ["$category", "SALE"] }, { $eq: ["$transactionType", "sent"] }] }, "$amount", 0] }
                    },
                    expenses: {
                        $sum: { $cond: [{ $and: [{ $eq: ["$category", "SALE"] }, { $eq: ["$transactionType", "received"] }] }, "$amount", 0] }
                    }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const yearlyReport = months.map((m, i) => {
            const data = yearlyReportRaw.find(d => d._id === i + 1) || { revenue: 0, expenses: 0 };
            return {
                month: m,
                revenue: data.revenue,
                profit: data.revenue - data.expenses,
                growth: 0 // Will calculate next
            };
        });

        // Calculate growth
        for (let i = 1; i < yearlyReport.length; i++) {
            const prev = yearlyReport[i - 1].revenue;
            const curr = yearlyReport[i].revenue;
            if (prev > 0) {
                yearlyReport[i].growth = Number((((curr - prev) / prev) * 100).toFixed(2));
            }
        }

        // ═══════════════════════════════════════════════════════════════════
        // 4. CUSTOMER INSIGHTS
        // ═══════════════════════════════════════════════════════════════════
        const topCustomers = await BusinessCustomer.find({ businessId })
            .sort({ totalPurchase: -1 })
            .limit(5)
            .select("name totalPurchase currentDue");

        const highestPending = await BusinessCustomer.find({ businessId, currentDue: { $gt: 0 } })
            .sort({ currentDue: -1 })
            .limit(5)
            .select("name totalPurchase currentDue");

        // ═══════════════════════════════════════════════════════════════════
        // 5. PRODUCT ANALYTICS — Only SALE+sent (our sales to customers)
        // ═══════════════════════════════════════════════════════════════════
        const productStats = await BusinessTransaction.aggregate([
            { $match: { businessId, category: "SALE", transactionType: "sent", date: { $gte: startDate } } },
            { $unwind: "$items" },
            {
                $group: {
                    _id: "$items.name",
                    totalRevenue: { $sum: { $multiply: ["$items.qty", "$items.price"] } },
                    totalSold: { $sum: "$items.qty" }
                }
            },
            { $sort: { totalRevenue: -1 } }
        ]);

        const topProducts = productStats.slice(0, 5);
        const leastPerforming = [...productStats].reverse().slice(0, 5);

        // ═══════════════════════════════════════════════════════════════════
        // 6. PAYMENT ANALYTICS
        // ═══════════════════════════════════════════════════════════════════
        const paymentMethods = await BusinessTransaction.aggregate([
            { $match: { businessId, category: "PAYMENT", date: { $gte: startDate } } },
            {
                $group: {
                    _id: "$paymentMethod",
                    total: { $sum: "$amount" }
                }
            }
        ]);

        // ═══════════════════════════════════════════════════════════════════
        // 7. BUSINESS HEALTH
        // ═══════════════════════════════════════════════════════════════════
        const profitMargin = summary.revenue > 0 ? Number(((netProfit / summary.revenue) * 100).toFixed(2)) : 0;
        const receivableRatio = summary.revenue > 0 ? Number(((customerBalances.totalReceivables / summary.revenue) * 100).toFixed(2)) : 0;

        return NextResponse.json({
            data: {
                businessSummary,
                trendData: trendData.map(d => ({ date: d._id, revenue: d.revenue, expenses: d.expenses, profit: d.revenue - d.expenses })),
                yearlyReport,
                customerInsights: {
                    topCustomers,
                    highestPending
                },
                productAnalytics: {
                    topProducts,
                    leastPerforming
                },
                paymentAnalytics: {
                    totalReceived: summary.paymentsReceived,
                    totalGiven: summary.paymentsGiven,
                    methodsBreakdown: paymentMethods.map(m => ({ method: m._id || 'Unknown', total: m.total }))
                },
                healthIndicators: {
                    profitMargin,
                    receivableRatio,
                    cashFlowStatus: cashFlowData.netCashFlow >= 0 ? "Positive" : "Negative"
                }
            }
        });
    } catch (error: any) {
        console.error("Advanced Analytics Error:", error);
        return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
    }
}
