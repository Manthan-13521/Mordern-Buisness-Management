import { NextResponse } from "next/server";
import { resolveUser, AuthUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";
import { BusinessSale } from "@/models/BusinessSale";
import { BusinessPayment } from "@/models/BusinessPayment";
import { BusinessTransaction } from "@/models/BusinessTransaction";
import { requestContext } from "@/lib/requestContext";

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

            await dbConnect();
            const businessId = user.businessId;

            // 1. Fetch all existing sales
            const sales = await BusinessSale.find({ businessId });
            console.log(`Found ${sales.length} sales to migrate`);

            // 2. Fetch all existing payments
            const payments = await BusinessPayment.find({ businessId });
            console.log(`Found ${payments.length} payments to migrate`);

            let migratedCount = 0;

            // 3. Migrate Sales
            const saleTransactions = sales.map(s => ({
                customerId: s.customerId,
                businessId: s.businessId,
                date: s.date,
                category: 'SALE',
                transactionType: (s as any).saleType || 'sent',
                amount: s.totalAmount,
                items: s.items,
                transportationCost: s.transportationCost,
                createdAt: s.createdAt,
                updatedAt: s.updatedAt
            }));

            // 4. Migrate Payments
            const paymentTransactions = payments.map(p => ({
                customerId: p.customerId,
                businessId: p.businessId,
                date: p.date,
                category: 'PAYMENT',
                transactionType: (p as any).paymentType || 'received',
                amount: p.amount,
                paymentMethod: p.type,
                notes: p.notes,
                createdAt: p.createdAt,
                updatedAt: p.updatedAt
            }));

            const allTransactions = [...saleTransactions, ...paymentTransactions];

            if (allTransactions.length > 0) {
                // Use insertMany for efficiency
                // We'll filter out duplicates if this is run multiple times by checking for same customerId, businessId, date, amount
                // Since this is a one-time migration, we can just insertMany or use a loop with upsert
                for (const tx of allTransactions) {
                    await BusinessTransaction.findOneAndUpdate(
                        { 
                            customerId: tx.customerId, 
                            businessId: tx.businessId, 
                            date: tx.date, 
                            amount: tx.amount,
                            category: tx.category 
                        } as any,
                        tx,
                        { upsert: true, new: true }
                    );
                    migratedCount++;
                }
            }

            return NextResponse.json({ 
                success: true, 
                migratedCount, 
                salesCount: sales.length, 
                paymentsCount: payments.length 
            });
        } catch (error: any) {
            console.error("Migration Error:", error);
            return NextResponse.json({ error: "Migration failed", details: error.message }, { status: 500 });
        }
        });
            
}
