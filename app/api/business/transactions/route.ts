import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import { BusinessTransaction } from "@/models/BusinessTransaction";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "business_admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();
        const businessId = session.user.businessId;

        const { searchParams } = new URL(req.url);
        const customerId = searchParams.get("customerId");

        let query: any = { businessId };
        if (customerId) {
            query.customerId = customerId;
        }

        const transactions = await BusinessTransaction.find(query)
            .populate("customerId", "name")
            .sort({ date: -1 });
            
        // Map to ensure paidAmount is present for all records
        const enhancedTransactions = transactions.map(t => {
            const obj = t.toObject();
            if (obj.category === 'SALE' && obj.paidAmount === undefined) {
                obj.paidAmount = 0;
            }
            return obj;
        });

        if (enhancedTransactions.length > 0) {
        }
            
        return NextResponse.json(enhancedTransactions, {
            headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" }
        });
    } catch (error) {
        console.error("Transactions Fetch Error:", error);
        return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 });
    }
}
