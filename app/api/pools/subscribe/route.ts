import { NextRequest, NextResponse } from "next/server";
import { resolveUser, AuthUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";
import { Pool } from "@/models/Pool";


export const dynamic = "force-dynamic";
export const revalidate = 0;

const PLAN_LIMITS: Record<string, { maxMembers: number; maxStaff: number; features: string[] }> = {
    free: {
        maxMembers: 50,
        maxStaff:   3,
        features:   [],
    },
    starter: {
        maxMembers: 200,
        maxStaff:   10,
        features:   ["whatsapp"],
    },
    pro: {
        maxMembers: 1000,
        maxStaff:   25,
        features:   ["whatsapp", "face_scan", "thermal_print"],
    },
    enterprise: {
        maxMembers: 999999,
        maxStaff:   999999,
        features:   ["whatsapp", "face_scan", "thermal_print", "entertainment", "competitions", "ai_occupancy"],
    },
};

/**
 * POST /api/pools/subscribe
 * Upgrades or changes the subscription plan for a pool.
 *
 * Body: { poolId, plan: "starter"|"pro"|"enterprise", durationMonths?: number }
 *
 * In a real integration this would be called by the Razorpay/Stripe webhook after
 * a successful payment. For now it accepts a direct call (suitable for manual upgrades
 * by super-admins or internal tooling).
 */
export async function POST(req: NextRequest) {
    try {
        await dbConnect();

        const user = await resolveUser(req) as any;

        // Allow superadmin OR authenticated admins upgrading their own pool
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        const body = await req.json();
        const { poolId, plan, durationMonths = 1 } = body;

        if (!poolId || !plan) {
            return NextResponse.json({ error: "poolId and plan are required" }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        if (!PLAN_LIMITS[plan]) {
            return NextResponse.json({ error: `Invalid plan. Valid plans: ${Object.keys(PLAN_LIMITS).join(", ")}` }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        // Admins can only upgrade their own pool
        if (user.role !== "superadmin" && user.poolId !== poolId) {
            return NextResponse.json({ error: "Forbidden — you can only manage your own pool" }, {  status: 403 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        // Calculate subscription end date
        const subscriptionEndsAt = new Date();
        subscriptionEndsAt.setMonth(subscriptionEndsAt.getMonth() + durationMonths);

        const limits = PLAN_LIMITS[plan];

        const pool = await Pool.findOneAndUpdate(
            { poolId },
            {
                $set: {
                    plan,
                    subscriptionStatus:  "active",
                    subscriptionEndsAt,
                    maxMembers:          limits.maxMembers,
                    maxStaff:            limits.maxStaff,
                    featuresEnabled:     limits.features,
                    // Clear trial date on upgrade
                    trialEndsAt:         undefined,
                },
            },
            { returnDocument: 'after' }
        );

        if (!pool) {
            return NextResponse.json({ error: "Pool not found" }, {  status: 404 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        return NextResponse.json({
            message:  `Pool upgraded to ${plan} plan successfully.`,
            pool: {
                poolId:             pool.poolId,
                plan:               pool.plan,
                subscriptionStatus: pool.subscriptionStatus,
                subscriptionEndsAt: pool.subscriptionEndsAt,
                maxMembers:         pool.maxMembers,
                featuresEnabled:    pool.featuresEnabled,
            },
        }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    } catch (error) {
        console.error("[POST /api/pools/subscribe]", error);
        return NextResponse.json({ error: "Failed to update subscription" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}

/**
 * GET /api/pools/subscribe
 * Returns current subscription details for the calling admin's pool (or any pool for superadmin).
 */
export async function GET(req: NextRequest) {
    try {
        await dbConnect();

        const user = await resolveUser(req) as any;
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        const url    = new URL(req.url);
        const poolId = user.role === "superadmin"
            ? (url.searchParams.get("poolId") ?? undefined)
            : user.poolId;

        if (!poolId) {
            return NextResponse.json({ error: "No poolId available" }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        const pool = await Pool.findOne({ poolId })
            .select("poolId poolName plan subscriptionStatus trialEndsAt subscriptionEndsAt maxMembers maxStaff featuresEnabled")
            .lean();

        if (!pool) {
            return NextResponse.json({ error: "Pool not found" }, {  status: 404 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        return NextResponse.json(pool, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    } catch (error) {
        console.error("[GET /api/pools/subscribe]", error);
        return NextResponse.json({ error: "Failed to fetch subscription details" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}
