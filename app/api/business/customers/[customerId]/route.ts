import { NextResponse } from "next/server";
import { resolveUser, AuthUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";
import { BusinessCustomer } from "@/models/BusinessCustomer";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ customerId: string }> }) {
    try {
        const { customerId } = await params;
        const user = await resolveUser(req);
        if (!user || user.role !== "business_admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();
        const businessId = user.businessId;

        const customer = await BusinessCustomer.findOne({ _id: customerId, businessId });
        if (!customer) {
            return NextResponse.json({ error: "Customer not found" }, { status: 404 });
        }

        return NextResponse.json(customer, {
            headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" }
        });
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch customer" }, { status: 500 });
    }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ customerId: string }> }) {
    try {
        const { customerId } = await params;
        const user = await resolveUser(req);
        if (!user || user.role !== "business_admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { name, phone, businessName, gstNumber, address } = body;

        await dbConnect();
        const businessId = user.businessId;

        const customer = await BusinessCustomer.findOneAndUpdate(
            { _id: customerId, businessId },
            { $set: { name, phone, businessName, gstNumber, address } },
            { new: true }
        );

        if (!customer) {
            return NextResponse.json({ error: "Customer not found" }, { status: 404 });
        }

        return NextResponse.json(customer, {
            headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" }
        });
    } catch (error) {
        return NextResponse.json({ error: "Failed to update customer" }, { status: 500 });
    }
}
