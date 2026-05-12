import { NextResponse } from "next/server";
import { resolveUser, AuthUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";
import { BusinessTransaction } from "@/models/BusinessTransaction";
import { logger } from "@/lib/logger";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    try {
        const user = await resolveUser(req);
        if (!user || user.role !== "business_admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();
        const businessId = user.businessId;
        const { searchParams } = new URL(req.url);
        const customerId = searchParams.get("customerId");

        const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
        const limit = Math.min(20, Math.max(1, parseInt(searchParams.get("limit") ?? "20")));
        const skip = (page - 1) * limit;

        let query: any = { businessId };
        if (customerId) {
            // Explicit ObjectId cast — matches customer detail API pattern.
            // Mongoose auto-casting from string can fail intermittently on cold starts.
            try {
                query.customerId = new mongoose.Types.ObjectId(customerId);
            } catch {
                return NextResponse.json({ data: [], total: 0, page, limit, totalPages: 0 }, { status: 200 });
            }
        }

        const [transactions, total] = await Promise.all([
            BusinessTransaction.find(query)
                .populate("customerId", "name")
                .select("customerId category amount paidAmount date transactionType paymentMethod notes receiptUrl fileUrl items transportationCost createdAt")
                .sort({ date: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            BusinessTransaction.countDocuments(query),
        ]);
            
        // Map to ensure paidAmount is present for all records
        const enhancedTransactions = transactions.map((t: any) => {
            if (t.category === 'SALE' && t.paidAmount === undefined) {
                t.paidAmount = 0;
            }
            return t;
        });
            
        return NextResponse.json({
            data: enhancedTransactions,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        }, {
            headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" }
        });
    } catch (error: any) {
        logger.error("Transactions fetch error", { error: error?.message });
        return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 });
    }
}

