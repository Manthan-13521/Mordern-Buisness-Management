import { NextResponse } from "next/server";
import { resolveUser, AuthUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";
import { BusinessTransaction } from "@/models/BusinessTransaction";
import { requireBusinessId } from "@/lib/tenant";
import { logger } from "@/lib/logger";
import mongoose from "mongoose";
import { requestContext } from "@/lib/requestContext";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {

        const requestId = req ? (req.headers.get("x-request-id") || crypto.randomUUID()) : crypto.randomUUID();
        const clientIp = req ? (req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown") : "unknown";
        const routePath = req ? new URL(req.url).pathname : "unknown";
        const requestMethod = "GET";

        return requestContext.run({
            requestId,
            ip: clientIp,
            route: routePath,
            method: requestMethod,
            startTime: Date.now()
        }, async () => {
            try {
            const user = await resolveUser(req);
            if (!user || user.role !== "business_admin") {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }


            let businessId: string;
            try {
                businessId = requireBusinessId(user);
            } catch (err: any) {
                return NextResponse.json({ error: err.message }, { status: err.message === "Unauthorized" ? 401 : 403 });
            }

            await dbConnect();

            // 🔴 TERMINAL DEFENSE
            if (!businessId) {
                throw new Error("Tenant context lost before query execution");
            }
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
        });
            
}

export async function PATCH(req: Request) {

        const requestId = req ? (req.headers.get("x-request-id") || crypto.randomUUID()) : crypto.randomUUID();
        const clientIp = req ? (req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown") : "unknown";
        const routePath = req ? new URL(req.url).pathname : "unknown";
        const requestMethod = "PATCH";

        return requestContext.run({
            requestId,
            ip: clientIp,
            route: routePath,
            method: requestMethod,
            startTime: Date.now()
        }, async () => {
            try {
            const user = await resolveUser(req);
            if (!user || user.role !== "business_admin") {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }

            const body = await req.json();
            const { transactionId, receiptUrl } = body;

            if (!transactionId || !receiptUrl) {
                return NextResponse.json({ error: "transactionId and receiptUrl are required" }, { status: 400 });
            }

            await dbConnect();

            let businessId: string;
            try {
                businessId = requireBusinessId(user);
            } catch (err: any) {
                return NextResponse.json({ error: err.message }, { status: err.message === "Unauthorized" ? 401 : 403 });
            }

            // 🔴 TERMINAL DEFENSE
            if (!businessId) {
                throw new Error("Tenant context lost before database operation");
            }

            // Only allow updating receipt on transactions owned by this business
            const updated = await BusinessTransaction.findOneAndUpdate(
                { _id: transactionId, businessId },
                { $set: { receiptUrl } },
                { new: true }
            );

            if (!updated) {
                return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
            }

            return NextResponse.json({ success: true, data: updated }, {
                headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" }
            });
        } catch (error: any) {
            logger.error("Transaction receipt update error", { error: error?.message });
            return NextResponse.json({ error: "Failed to update receipt" }, { status: 500 });
        }
        });
            
}
