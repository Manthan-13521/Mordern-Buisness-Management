import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { Competition } from "@/models/Competition";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * GET /api/competitions
 * List competitions for pool — paginated, filterable by status.
 * ?status=upcoming|active|completed&page=&limit=
 */
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const page     = Math.max(1, Number(searchParams.get("page")  ?? 1));
        const limit    = Math.min(50, Number(searchParams.get("limit") ?? 20));
        const status   = searchParams.get("status"); // "upcoming" | "completed" | null (all)
        const poolId   = session.user.role === "superadmin"
            ? (searchParams.get("poolId") ?? session.user.poolId)
            : session.user.poolId;

        await connectDB();

        const filter: Record<string, unknown> = { poolId };
        if (status === "completed") filter.isCompleted = true;
        if (status === "upcoming")  { filter.isCompleted = false; filter.date = { $gte: new Date() }; }
        if (status === "past")      { filter.isCompleted = false; filter.date = { $lt:  new Date() }; }

        const [data, total] = await Promise.all([
            Competition.find(filter)
                .sort({ date: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            Competition.countDocuments(filter),
        ]);

        return NextResponse.json({ data, total, page, limit });
    } catch (error) {
        console.error("[GET /api/competitions]", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

/**
 * POST /api/competitions
 * Create a new competition event.
 * Body: { name, date, category, notes? }
 */
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || !["admin", "superadmin"].includes(session.user.role)) {
            return NextResponse.json({ error: "Admin only" }, { status: 403 });
        }

        const body = await req.json();
        const { name, date, category, notes } = body;

        if (!name?.trim() || !date || !category?.trim()) {
            return NextResponse.json({ error: "name, date, and category are required" }, { status: 400 });
        }

        await connectDB();

        const competition = await Competition.create({
            poolId:       session.user.poolId,
            name:         name.trim(),
            date:         new Date(date),
            category:     category.trim(),
            notes:        notes?.trim() || undefined,
            participants: [],
            winners:      [],
            isCompleted:  false,
        });

        return NextResponse.json(competition, { status: 201 });
    } catch (error) {
        console.error("[POST /api/competitions]", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
