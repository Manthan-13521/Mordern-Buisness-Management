import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import { BusinessTransaction } from "@/models/BusinessTransaction";
import { BusinessCustomer } from "@/models/BusinessCustomer";
import { requireBusinessId } from "@/lib/tenant";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        
        let businessId;
        try {
            businessId = requireBusinessId(session?.user);
        } catch (err: any) {
            return NextResponse.json({ error: err.message }, { status: err.message === "Unauthorized" ? 401 : 403 });
        }

        // 🟠 DOUBLE DEFENSE: Explicit type and validity checks
        if (!businessId || typeof businessId !== "string") {
            throw new Error("Invalid businessId type or value");
        }
        if (businessId !== "superadmin" && !mongoose.Types.ObjectId.isValid(businessId)) {
            throw new Error("Invalid businessId format");
        }

        // 🟢 STRUCTURED AUDIT LOGGING
        console.info(JSON.stringify({
            type: "BUSINESS_ANALYTICS_QUERY",
            businessId,
            userId: session?.user?.id,
            timestamp: new Date().toISOString()
        }));

        await dbConnect();

        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const yearStart = new Date(now.getFullYear(), 0, 1);

        const [
            dailySalesRaw,
            monthlySalesRaw,
            yearlySalesRaw,
            totalDueRaw,
            recentSalesRaw,
            recentPaymentsRaw
        ] = await Promise.all([
            BusinessTransaction.aggregate([
                { $match: { businessId, date: { $gte: todayStart }, category: 'SALE' } },
                { $group: { _id: null, total: { $sum: "$amount" } } }
            ]),
            BusinessTransaction.aggregate([
                { $match: { businessId, date: { $gte: monthStart }, category: 'SALE' } },
                { $group: { _id: null, total: { $sum: "$amount" } } }
            ]),
            BusinessTransaction.aggregate([
                { $match: { businessId, date: { $gte: yearStart }, category: 'SALE' } },
                { $group: { _id: null, total: { $sum: "$amount" } } }
            ]),
            BusinessCustomer.aggregate([
                { $match: { businessId } },
                { $group: { _id: null, total: { $sum: "$currentDue" } } }
            ]),
            BusinessTransaction.find({ businessId, category: 'SALE' })
                .populate("customerId", "name")
                .sort({ date: -1 })
                .limit(5),
            BusinessTransaction.find({ businessId, category: 'PAYMENT' })
                .populate("customerId", "name")
                .sort({ date: -1 })
                .limit(5)
        ]);

        // 🟠 AGGREGATION SAFETY: Fallback for Mongo structure quirks
        const dailySales = Array.isArray(dailySalesRaw) ? dailySalesRaw : [];
        const monthlySales = Array.isArray(monthlySalesRaw) ? monthlySalesRaw : [];
        const yearlySales = Array.isArray(yearlySalesRaw) ? yearlySalesRaw : [];
        const totalDue = Array.isArray(totalDueRaw) ? totalDueRaw : [];
        const recentSales = Array.isArray(recentSalesRaw) ? recentSalesRaw : [];
        const recentPayments = Array.isArray(recentPaymentsRaw) ? recentPaymentsRaw : [];

        const hasNoData = recentSales.length === 0 && recentPayments.length === 0;

        return NextResponse.json({
            stats: {
                dailySales: dailySales[0]?.total || 0,
                monthlySales: monthlySales[0]?.total || 0,
                yearlySales: yearlySales[0]?.total || 0,
                totalDue: totalDue[0]?.total || 0
            },
            recentSales,
            recentPayments,
            meta: {
                message: hasNoData ? "No data for this tenant" : "Analytics fetched successfully",
                businessId,
                timestamp: new Date().toISOString()
            }
        }, {
            headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" }
        });
    } catch (error: any) {
        console.error("Analytics Error:", error);
        return NextResponse.json({ 
            error: "Failed to fetch analytics",
            details: error.message 
        }, { status: 500 });
    }
}
