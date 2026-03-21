import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { Pool } from "@/models/Pool";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { nanoid } from "nanoid";

/**
 * GET /api/super-admin/pools
 * Returns paginated list of all pools.
 * Supports: ?page=1&limit=20&status=ACTIVE|SUSPENDED|INACTIVE&search=<name>
 */
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions) as any;
        if (!session?.user || session.user.role !== "superadmin") {
            return NextResponse.json({ error: "Superadmin only", code: "FORBIDDEN" }, { status: 403 });
        }

        await dbConnect();

        const url    = new URL(req.url);
        const page   = Math.max(1, parseInt(url.searchParams.get("page")  ?? "1"));
        const limit  = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "20")));
        const skip   = (page - 1) * limit;

        const query: Record<string, unknown> = {};

        const statusParam = url.searchParams.get("status");
        if (statusParam) query.status = statusParam;

        const searchParam = url.searchParams.get("search");
        if (searchParam) {
            query.$or = [
                { poolName:   { $regex: searchParam, $options: "i" } },
                { adminEmail: { $regex: searchParam, $options: "i" } },
                { slug:       { $regex: searchParam, $options: "i" } },
            ];
        }

        const subStatus = url.searchParams.get("subscriptionStatus");
        if (subStatus) query.subscriptionStatus = subStatus;

        const [pools, total] = await Promise.all([
            Pool.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Pool.countDocuments(query),
        ]);

        return NextResponse.json({
            data: pools,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        console.error("[GET /api/super-admin/pools]", error);
        return NextResponse.json({ error: "Failed to fetch pools" }, { status: 500 });
    }
}

/**
 * POST /api/super-admin/pools
 * Creates a new pool (tenant) from the super-admin dashboard.
 */
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions) as any;
        if (!session?.user || session.user.role !== "superadmin") {
            return NextResponse.json({ error: "Superadmin only", code: "FORBIDDEN" }, { status: 403 });
        }

        await dbConnect();

        const body = await req.json();
        const { poolName, slug, adminEmail, capacity, location, plan = "free" } = body;

        if (!poolName || !slug || !adminEmail) {
            return NextResponse.json(
                { error: "poolName, slug and adminEmail are required" },
                { status: 400 }
            );
        }

        // Generate unique poolId
        const poolId = `POOL_${nanoid(8).toUpperCase()}`;

        // Set trial period: 14 days from now
        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + 14);

        const pool = await Pool.create({
            poolId,
            poolName,
            slug:               slug.toLowerCase().replace(/\s+/g, "-"),
            adminEmail,
            capacity:           capacity ?? 100,
            location:           location ?? "",
            status:             "ACTIVE",
            plan,
            subscriptionStatus: "trial",
            trialEndsAt,
        });

        return NextResponse.json(pool, { status: 201 });
    } catch (error: any) {
        if (error?.code === 11000) {
            return NextResponse.json(
                { error: "A pool with this slug or poolId already exists.", code: "DUPLICATE_KEY" },
                { status: 409 }
            );
        }
        console.error("[POST /api/super-admin/pools]", error);
        return NextResponse.json({ error: "Failed to create pool" }, { status: 500 });
    }
}

/**
 * PATCH /api/super-admin/pools
 * Suspends or reactivates a pool.
 * Body: { poolId, status: "ACTIVE" | "SUSPENDED" | "INACTIVE" }
 */
export async function PATCH(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions) as any;
        if (!session?.user || session.user.role !== "superadmin") {
            return NextResponse.json({ error: "Superadmin only", code: "FORBIDDEN" }, { status: 403 });
        }

        await dbConnect();

        const { poolId, status } = await req.json();
        if (!poolId || !status) {
            return NextResponse.json({ error: "poolId and status are required" }, { status: 400 });
        }

        const pool = await Pool.findOneAndUpdate(
            { poolId },
            { $set: { status } },
            { new: true }
        );

        if (!pool) {
            return NextResponse.json({ error: "Pool not found" }, { status: 404 });
        }

        return NextResponse.json(pool);
    } catch (error) {
        console.error("[PATCH /api/super-admin/pools]", error);
        return NextResponse.json({ error: "Failed to update pool" }, { status: 500 });
    }
}
