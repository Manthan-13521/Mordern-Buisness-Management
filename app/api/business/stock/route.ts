import { NextResponse } from "next/server";
import { resolveUser, AuthUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";
import { BusinessStock } from "@/models/BusinessStock";
import { requireBusinessId } from "@/lib/tenant";
import { financialWriteLimiter } from "@/lib/rateLimiter";
import { auditLog } from "@/lib/auditLog";
import { logger } from "@/lib/logger";
import { z } from "zod";
import crypto from "crypto";

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

// ── Idempotency Guard (LRU, 5-second window) ──
const recentStockKeys = new Map<string, number>();
const IDEMPOTENCY_WINDOW_MS = 5_000;
const MAX_CACHE_SIZE = 500;
function checkIdempotency(key: string): boolean {
    const now = Date.now();
    if (recentStockKeys.size > MAX_CACHE_SIZE) {
        for (const [k, ts] of recentStockKeys) {
            if (now - ts > IDEMPOTENCY_WINDOW_MS) recentStockKeys.delete(k);
        }
    }
    if (recentStockKeys.has(key) && now - recentStockKeys.get(key)! < IDEMPOTENCY_WINDOW_MS) return true;
    recentStockKeys.set(key, now);
    return false;
}

export async function GET(req: Request) {
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

        const stocks = await BusinessStock.find({ businessId }).sort({ name: 1 });
        return NextResponse.json(stocks, {
            headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" }
        });
    } catch (error: any) {
        logger.error("Stock fetch error", { error: error?.message });
        return NextResponse.json({ error: "Failed to fetch stock" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const user = await resolveUser(req);
        if (!user || user.role !== "business_admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 🟠 RATE LIMITING
        const ip = req.headers.get("x-forwarded-for") || "unknown";
        const rl = financialWriteLimiter.checkTenant(user.businessId || "unknown", ip);
        if (!rl.allowed) {
            return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429 });
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

        let businessId: string;
        try {
            businessId = requireBusinessId(user);
        } catch (err: any) {
            return NextResponse.json({ error: err.message }, { status: err.message === "Unauthorized" ? 401 : 403 });
        }

        await dbConnect();

        // 🔴 TERMINAL DEFENSE
        if (!businessId) {
            throw new Error("Tenant context lost before database operation");
        }

        // 🟡 IDEMPOTENCY: Prevent duplicate stock creation from retries
        const idempotencyKey = crypto.createHash("md5").update(`${businessId}:stock:${name}`).digest("hex");
        if (checkIdempotency(idempotencyKey)) {
            logger.warn("Duplicate stock creation blocked", { businessId, name });
            return NextResponse.json({ error: "Duplicate submission detected. Please wait." }, { status: 429 });
        }

        const stock = new BusinessStock({
            name,
            currentQuantity,
            unit,
            businessId
        });

        await stock.save();
        
        auditLog.financial({ businessId, userId: user.id, action: "STOCK_CREATED", details: { name, currentQuantity } });

        return NextResponse.json(stock, {
            status: 201,
            headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" }
        });
    } catch (error: any) {
        if ((error as any).code === 11000) {
            return NextResponse.json({ error: "Stock item with this name already exists" }, { status: 400 });
        }
        logger.error("Stock create error", { error: error?.message });
        return NextResponse.json({ error: "Failed to create stock item" }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const user = await resolveUser(req);
        if (!user || user.role !== "business_admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 🟠 RATE LIMITING
        const ip = req.headers.get("x-forwarded-for") || "unknown";
        const rl = financialWriteLimiter.checkTenant(user.businessId || "unknown", ip);
        if (!rl.allowed) {
            return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429 });
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

        let businessId: string;
        try {
            businessId = requireBusinessId(user);
        } catch (err: any) {
            return NextResponse.json({ error: err.message }, { status: err.message === "Unauthorized" ? 401 : 403 });
        }

        await dbConnect();

        // 🔴 TERMINAL DEFENSE
        if (!businessId) {
            throw new Error("Tenant context lost before database operation");
        }

        const stock = await BusinessStock.findOneAndUpdate(
            { _id, businessId },
            { currentQuantity },
            { new: true }
        );

        if (!stock) {
            return NextResponse.json({ error: "Stock item not found" }, { status: 404 });
        }

        auditLog.financial({ businessId, userId: user.id, action: "STOCK_UPDATED", details: { stockId: _id, currentQuantity } });

        return NextResponse.json(stock, {
            headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" }
        });
    } catch (error: any) {
        logger.error("Stock update error", { error: error?.message });
        return NextResponse.json({ error: "Failed to update stock" }, { status: 500 });
    }
}
