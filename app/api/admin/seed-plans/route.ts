/**
 * H-6 FIX: SaaS Plan Seed API
 * 
 * Without at least one SaaSPlan in the database, Organization.create() will fail
 * with a ValidationError because planId is required. This seeds the default plans.
 * 
 * USAGE: GET /api/admin/seed-plans  (superadmin only, idempotent)
 * 
 * Safe to call multiple times — uses findOneAndUpdate with $setOnInsert.
 */

import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

const DEFAULT_PLANS = [
    {
        name: "Starter",
        price: 999,
        maxMembers: 100,
        maxStaff: 3,
        features: {
            analytics: false,
            whatsapp: false,
            autoBlock: true,
            prioritySupport: false,
        },
        isActive: true,
    },
    {
        name: "Pro",
        price: 2499,
        maxMembers: 500,
        maxStaff: 10,
        features: {
            analytics: true,
            whatsapp: true,
            autoBlock: true,
            prioritySupport: false,
        },
        isActive: true,
    },
    {
        name: "Enterprise",
        price: 4999,
        maxMembers: 9999,
        maxStaff: 50,
        features: {
            analytics: true,
            whatsapp: true,
            autoBlock: true,
            prioritySupport: true,
        },
        isActive: true,
    },
];

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || (session.user as any).role !== "superadmin") {
            return NextResponse.json({ error: "Forbidden" }, {  status: 403 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        await dbConnect();
        const { SaaSPlan } = await import("@/models/SaaSPlan");

        const results = await Promise.all(
            DEFAULT_PLANS.map(plan =>
                (SaaSPlan as any).findOneAndUpdate(
                    { name: plan.name },
                    { $setOnInsert: plan },   // only write if it doesn't exist
                    { upsert: true, new: true }
                )
            )
        );

        const plans = results.map((p: any) => ({ id: p._id, name: p.name, price: p.price }));

        return NextResponse.json({
            success: true,
            message: `${plans.length} SaaS plans seeded (idempotent — safe to re-run).`,
            plans,
        }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });

    } catch (e) {
        console.error("[Seed Plans]", e);
        return NextResponse.json({ error: "Failed to seed plans" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}
