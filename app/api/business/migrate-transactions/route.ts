import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import { BusinessSale } from "@/models/BusinessSale";
import { BusinessPayment } from "@/models/BusinessPayment";
import { BusinessTransaction } from "@/models/BusinessTransaction";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "business_admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();
        const businessId = session.user.businessId;

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
            transactionType: s.saleType || 'sent',
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
            transactionType: p.paymentType || 'received',
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
                    },
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
}
