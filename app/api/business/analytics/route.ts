import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import { BusinessTransaction } from "@/models/BusinessTransaction";
import { BusinessCustomer } from "@/models/BusinessCustomer";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "business_admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();
        const businessId = session.user.businessId;

        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const yearStart = new Date(now.getFullYear(), 0, 1);

        const [
            dailySales,
            monthlySales,
            yearlySales,
            totalDue,
            recentSales,
            recentPayments
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

        return NextResponse.json({
            stats: {
                dailySales: dailySales[0]?.total || 0,
                monthlySales: monthlySales[0]?.total || 0,
                yearlySales: yearlySales[0]?.total || 0,
                totalDue: totalDue[0]?.total || 0
            },
            recentSales,
            recentPayments
        }, {
            headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" }
        });
    } catch (error) {
        console.error("Analytics Error:", error);
        return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
    }
}
