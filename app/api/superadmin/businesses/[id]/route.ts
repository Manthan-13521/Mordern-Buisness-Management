import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { Business } from "@/models/Business";
import { User } from "@/models/User";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { BusinessTransaction } from "@/models/BusinessTransaction";
import { BusinessCustomer } from "@/models/BusinessCustomer";

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
    try {
        await dbConnect();
        const session = await getServerSession(authOptions);
        if (!session?.user || (session.user as any).role !== "superadmin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await props.params;
        const business = await Business.findOne({ businessId: id }).lean();
        if (!business) {
            return NextResponse.json({ error: "Business not found" }, { status: 404 });
        }

        // Fetch some basic stats for the "Details" view
        const [customerCount, transactionCount] = await Promise.all([
            BusinessCustomer.countDocuments({ businessId: id }),
            BusinessTransaction.countDocuments({ businessId: id }),
        ]);

        return NextResponse.json({
            ...business,
            stats: {
                customers: customerCount,
                transactions: transactionCount
            }
        });
    } catch (error) {
        console.error("Fetch Business Details Error:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
    try {
        await dbConnect();
        const session = await getServerSession(authOptions);
        if (!session?.user || (session.user as any).role !== "superadmin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await props.params;
        const { isActive } = await req.json();

        const business = await Business.findOneAndUpdate(
            { businessId: id },
            { isActive },
            { new: true }
        );

        if (!business) {
            return NextResponse.json({ error: "Business not found" }, { status: 404 });
        }

        return NextResponse.json(business);
    } catch (error) {
        console.error("Toggle Business Error:", error);
        return NextResponse.json({ error: "Server error toggling status" }, { status: 500 });
    }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
    try {
        await dbConnect();
        const session = await getServerSession(authOptions);
        if (!session?.user || (session.user as any).role !== "superadmin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await props.params;
        const business = await Business.findOne({ businessId: id });
        if (!business) {
            return NextResponse.json({ error: "Business not found" }, { status: 404 });
        }

        // CASCADE DELETE ALL RELATED DATA
        const collectionsToDeleteFrom = [
            { model: "BusinessTransaction", query: { businessId: id } },
            { model: "BusinessCustomer", query: { businessId: id } },
            { model: "BusinessLabour", query: { businessId: id } },
            { model: "BusinessLabourPayment", query: { businessId: id } },
            { model: "BusinessStock", query: { businessId: id } },
            { model: "BusinessSale", query: { businessId: id } },
            { model: "BusinessPayment", query: { businessId: id } },
            { model: "BusinessAttendance", query: { businessId: id } },
            { model: "User", query: { businessId: id } },
        ];

        for (const item of collectionsToDeleteFrom) {
            try {
                const { [item.model]: ModelImport } = await import(`@/models/${item.model}`);
                await ModelImport.deleteMany(item.query);
            } catch (err) {
                console.warn(`Could not delete from ${item.model}:`, err);
            }
        }

        await Business.deleteOne({ businessId: id });

        return NextResponse.json({ message: `Business "${business.name}" and all associated records deleted successfully` });
    } catch (error) {
        console.error("Delete Business Error:", error);
        return NextResponse.json({ error: "Server error deleting business" }, { status: 500 });
    }
}
