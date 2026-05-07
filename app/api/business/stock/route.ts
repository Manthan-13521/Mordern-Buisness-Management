import { NextResponse } from "next/server";
import { resolveUser, AuthUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";
import { BusinessStock } from "@/models/BusinessStock";
import { z } from "zod";

export const dynamic = "force-dynamic";

// ── Zod Schemas ──────────────────────────────────────────────────────────
const StockCreateSchema = z.object({
    name: z.string().min(1, "Name is required").max(100, "Name too long"),
    currentQuantity: z.number().min(0).max(999999).default(0),
    unit: z.string().max(20).optional(),
});

const StockUpdateSchema = z.object({
    _id: z.string().min(1, "ID is required"),
    currentQuantity: z.number().min(0).max(999999),
});

export async function GET(req: Request) {
    try {
        const user = await resolveUser(req);
        if (!user || user.role !== "business_admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();
        const businessId = user.businessId;

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
        const user = await resolveUser(req);
        if (!user || user.role !== "business_admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const parsed = StockCreateSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        const { name, currentQuantity, unit } = parsed.data;

        await dbConnect();
        const businessId = user.businessId;

        const stock = new BusinessStock({
            name,
            currentQuantity,
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
        const user = await resolveUser(req);
        if (!user || user.role !== "business_admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const parsed = StockUpdateSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        const { _id, currentQuantity } = parsed.data;

        await dbConnect();
        const businessId = user.businessId;

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

