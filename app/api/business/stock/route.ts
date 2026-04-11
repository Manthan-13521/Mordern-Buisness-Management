import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import { BusinessStock } from "@/models/BusinessStock";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "business_admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();
        const businessId = session.user.businessId;

        const stocks = await BusinessStock.find({ businessId }).sort({ name: 1 });
        return NextResponse.json(stocks, {
            headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" }
        });
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch stock" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "business_admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { name, currentQuantity, unit } = body;

        if (!name) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }

        await dbConnect();
        const businessId = session.user.businessId;

        const stock = new BusinessStock({
            name,
            currentQuantity: currentQuantity || 0,
            unit,
            businessId
        });

        await stock.save();
        return NextResponse.json(stock, {
            status: 201,
            headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" }
        });
    } catch (error) {
        if ((error as any).code === 11000) {
            return NextResponse.json({ error: "Stock item with this name already exists" }, { status: 400 });
        }
        return NextResponse.json({ error: "Failed to create stock item" }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "business_admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { _id, currentQuantity } = body;

        if (!_id) {
            return NextResponse.json({ error: "ID is required" }, { status: 400 });
        }

        await dbConnect();
        const businessId = session.user.businessId;

        const stock = await BusinessStock.findOneAndUpdate(
            { _id, businessId },
            { currentQuantity },
            { new: true }
        );

        if (!stock) {
            return NextResponse.json({ error: "Stock item not found" }, { status: 404 });
        }

        return NextResponse.json(stock, {
            headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" }
        });
    } catch (error) {
        return NextResponse.json({ error: "Failed to update stock" }, { status: 500 });
    }
}
