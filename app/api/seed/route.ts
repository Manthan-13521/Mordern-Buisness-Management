import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { User } from "@/models/User";
import { Pool } from "@/models/Pool";
import { PlatformAdmin } from "@/models/PlatformAdmin";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * POST /api/seed
 * Creates a platform super admin + demo pool + admin user for initial setup.
 *
 * ⚠️  BLOCKED in production. Only works in development/staging.
 * ⚠️  Protected by SEED_SECRET env variable.
 * ⚠️  Passwords MUST be provided via env vars (never hardcoded).
 *
 * Required env vars:
 *   SEED_SECRET, SEED_ADMIN_PASSWORD, SEED_OPERATOR_PASSWORD
 */
export async function POST(req: NextRequest) {
    // ── Gate: Block in production ────────────────────────────────────────
    if (process.env.NODE_ENV === "production") {
        return new NextResponse(null, { status: 404 });
    }

    // ── Auth: Require SEED_SECRET ────────────────────────────────────────
    const seedSecret = process.env.SEED_SECRET;
    if (!seedSecret) {
        return NextResponse.json(
            { error: "SEED_SECRET is not configured on the server.", code: "MISCONFIGURED" },
            { status: 500 }
        );
    }

    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token || token !== seedSecret) {
        return NextResponse.json(
            { error: "Unauthorized", code: "FORBIDDEN" },
            { status: 401 }
        );
    }

    // ── Validate: Require env-based passwords ────────────────────────────
    const superAdminPassword = process.env.SEED_ADMIN_PASSWORD;
    const operatorPassword = process.env.SEED_OPERATOR_PASSWORD || superAdminPassword;

    if (!superAdminPassword || superAdminPassword.length < 12) {
        return NextResponse.json(
            { error: "SEED_ADMIN_PASSWORD must be set and at least 12 characters.", code: "MISCONFIGURED" },
            { status: 500 }
        );
    }

    await dbConnect();

    // 1. Seed Platform Super Admin
    const superAdminEmail = "superadmin@tspools.com";
    const existingSuperAdmin = await PlatformAdmin.findOne({ email: superAdminEmail });
    if (!existingSuperAdmin) {
        const superAdminPasswordHash = await bcrypt.hash(superAdminPassword, 12);
        await PlatformAdmin.create({
            email: superAdminEmail,
            passwordHash: superAdminPasswordHash,
            role: "superadmin"
        });
        console.log("✅ Super Admin created (password from env)");
    }

    // 2. Seed Demo Pool
    // Idempotent — don't create duplicates
    const existingPool = await Pool.findOne({ slug: "demo-pool" }).lean();
    if (existingPool) {
        return NextResponse.json({ 
            message: "Seed data already exists (Demo Pool, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } }). Super Admin checked.",
            superAdmin: superAdminEmail
        }, { status: 200 });
    }

    const poolId = "DEMO001";
    await Pool.create({
        poolId,
        poolName: "Demo Pool",
        slug: "demo-pool",
        adminEmail: "admin@demo.com",
        capacity: 100,
        status: "ACTIVE",
    });

    const passwordHash = await bcrypt.hash(operatorPassword!, 12);
    await User.create({
        name: "Demo Admin",
        email: "admin@demo.com",
        passwordHash,
        role: "admin",
        poolId,
        isActive: true,
    });

    console.warn("⚠️  Seed complete. Passwords sourced from env vars.");
    return NextResponse.json({ message: "Seed data created successfully." }, { status: 201 });
}

/**
 * GET /api/seed — always returns 404 in production, 401 otherwise
 */
export async function GET() {
    if (process.env.NODE_ENV === "production") {
        return new NextResponse(null, { status: 404 });
    }
    return NextResponse.json(
        { error: "Unauthorized", code: "FORBIDDEN" },
        { status: 401 }
    );
}
