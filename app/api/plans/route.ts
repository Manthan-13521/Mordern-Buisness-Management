import { NextResponse } from "next/server";
import { resolveUser, AuthUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";
import { Plan } from "@/models/Plan";

import mongoose from "mongoose";
import { PlanSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

/**
 * GET /api/plans
 * Supports: ?page=1&limit=20&slug=<poolSlug> (public) or user-based
 */
export async function GET(req: Request) {
    try {
        const [,] = await Promise.all([dbConnect(), Promise.resolve()]);
        const { searchParams } = new URL(req.url);
        const slug = searchParams.get("slug");

        // ── Public: plan list by pool slug (registration page) ────────────
        if (slug) {
            const PoolModel = mongoose.models.Pool ||
                mongoose.model("Pool", new mongoose.Schema({ slug: String, poolName: String, poolId: String, adminPhone: String }));
            const pool = await PoolModel.findOne({ slug }).lean() as any;
            if (!pool) return NextResponse.json({ error: "Pool not found" }, {  status: 404 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });

            const plans = await Plan.find({ deletedAt: null, poolId: pool.poolId, isActive: true }).sort({ price: 1 }).lean();
            return NextResponse.json({ poolName: pool.poolName, adminPhone: pool.adminPhone, plans }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        // ── Admin: paginated plan list ─────────────────────────────────────
        const user = await resolveUser(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        const page  = Math.max(1, parseInt(searchParams.get("page")  ?? "1"));
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50")));
        const skip  = (page - 1) * limit;

        const query: Record<string, unknown> = { deletedAt: null };

        if (user.role !== "superadmin") {
            query.poolId = user.poolId || "UNASSIGNED_POOL";
        }

        const activeFilter = searchParams.get("isActive");
        if (activeFilter !== null) query.isActive = activeFilter === "true";

        const [plans, total] = await Promise.all([
            Plan.find(query).sort({ price: 1 }).skip(skip).limit(limit).lean(),
            Plan.countDocuments(query),
        ]);

        return NextResponse.json({ data: plans, total, page, limit, totalPages: Math.ceil(total / limit) }, {
            headers: { "Cache-Control": "private, max-age=5, stale-while-revalidate=30" },
        });
    } catch (error) {
        console.error("[GET /api/plans]", error);
        return NextResponse.json({ error: "Failed to fetch plans" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}

/**
 * POST /api/plans
 * Admin only — creates a plan tied to the authenticated pool.
 */
export async function POST(req: Request) {
    try {
        const [, user] = await Promise.all([
            dbConnect(),
            resolveUser(req),
        ]);
        if (!user || !["admin", "superadmin"].includes(user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        const body = await req.json();
        const result = PlanSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json({ error: result.error.flatten() }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }
        const data = result.data;
        const {
            name, price,
            durationDays, durationHours, durationMinutes, durationSeconds,
            features, whatsAppAlert, allowQuantity, voiceAlert, description,
            hasEntertainment, hasFaceScan, quickDelete, hasTokenPrint,
            enableWhatsAppAlerts,
            poolId: bodyPoolId,
        } = { ...body, ...data }; // Merge specific body items that are not in schema

        const poolId = user.role === "superadmin" ? bodyPoolId : user.poolId;
        if (!poolId) return NextResponse.json({ error: "Pool ID required" }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });

        // Use enableWhatsAppAlerts as canonical; fall back to whatsAppAlert for legacy
        const alertEnabled = enableWhatsAppAlerts ?? whatsAppAlert ?? false;

        const plan = new Plan({
            name, description, poolId,
            durationDays, durationHours, durationMinutes, durationSeconds,
            price: Number(price),
            features:              features              ?? [],
            whatsAppAlert:         alertEnabled,
            enableWhatsAppAlerts:  alertEnabled,
            allowQuantity:         allowQuantity         ?? false,
            voiceAlert:            voiceAlert            ?? false,
            hasEntertainment:      hasEntertainment      ?? false,
            hasFaceScan:           hasFaceScan           ?? false,
            quickDelete:           quickDelete           ?? false,
            hasTokenPrint:         hasTokenPrint         ?? false,
            isActive:              true,
            ...(body.messages ? { messages: body.messages } : {}),
        });

        await plan.save();
        return NextResponse.json(plan, {  status: 201 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    } catch (error) {
        console.error("[POST /api/plans]", error);
        return NextResponse.json({ error: "Failed to create plan" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}
