import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { User } from "@/models/User";
import { Pool } from "@/models/Pool";
import bcrypt from "bcryptjs";

/**
 * POST /api/seed
 * Creates a demo pool + admin user for initial setup.
 *
 * ⚠️  Protected by SEED_SECRET env variable.
 * Send: Authorization: Bearer <SEED_SECRET>
 */
export async function POST(req: NextRequest) {
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

    await connectDB();

    // Idempotent — don't create duplicates
    const existing = await Pool.findOne({ slug: "demo-pool" }).lean();
    if (existing) {
        return NextResponse.json({ message: "Seed data already exists." }, { status: 200 });
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

    const passwordHash = await bcrypt.hash("admin123", 10);
    await User.create({
        name: "Demo Admin",
        email: "admin@demo.com",
        passwordHash,
        role: "admin",
        poolId,
        isActive: true,
    });

    return NextResponse.json({ message: "Seed data created successfully." }, { status: 201 });
}

/**
 * GET /api/seed — always returns 401 (no accidental browser exposure)
 */
export async function GET() {
    return NextResponse.json(
        { error: "Unauthorized", code: "FORBIDDEN" },
        { status: 401 }
    );
}
