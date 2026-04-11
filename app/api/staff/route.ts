import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { Staff } from "@/models/Staff";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { StaffCreateSchema } from "@/lib/validators";
import { apiError } from "@/lib/apiError";

export const dynamic = "force-dynamic";
export const revalidate = 0;

let _staffCounter = 0;

function generateStaffId(role: string): string {
    _staffCounter++;
    const prefix = role === "Trainer" ? "TR" : role === "Manager" ? "MG" : "ST";
    return `${prefix}${String(Date.now()).slice(-4)}${String(_staffCounter).padStart(2, "0")}`;
}

/**
 * GET /api/staff
 * List all staff for the pool (paginated, searchable).
 */
export async function GET(req: NextRequest) {
    try {
        const [, session] = await Promise.all([
            dbConnect(),
            getServerSession(authOptions),
        ]);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const page  = Math.max(1, Number(searchParams.get("page")  ?? 1));
        const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? 20)));
        const search = searchParams.get("search") ?? "";
        const poolId = session.user.role === "superadmin"
            ? (searchParams.get("poolId") ?? "")
            : (session.user.poolId ?? "");

        const filter: Record<string, unknown> = { poolId };
        if (search) {
            filter.$or = [
                { name:    { $regex: search, $options: "i" } },
                { staffId: { $regex: search, $options: "i" } },
                { phone:   { $regex: search, $options: "i" } },
            ];
        }

        const [data, total] = await Promise.all([
            Staff.find(filter)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            Staff.countDocuments(filter),
        ]);

        return NextResponse.json({ data, total, page, limit }, {
            headers: { "Cache-Control": "private, max-age=5, stale-while-revalidate=30" },
        });
    } catch (error) {
        console.error("[GET /api/staff]", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

/**
 * POST /api/staff
 * Create a new staff member.
 * Body: { name, phone, role, faceScanEnabled? }
 */
export async function POST(req: NextRequest) {
    try {
        const [, session] = await Promise.all([
            dbConnect(),
            getServerSession(authOptions),
        ]);
        if (!session?.user || session.user.role !== "admin") {
            return NextResponse.json({ error: "Admin only" }, { status: 403 });
        }

        const body = await req.json();
        const parsed = StaffCreateSchema.parse(body);
        const { name, phone, role } = parsed;

        const staffId = generateStaffId(role);
        const staff = await Staff.create({
            staffId,
            poolId: session.user.poolId,
            name:   name.trim(),
            phone:  phone.trim(),
            role,
        });

        return NextResponse.json(staff, { status: 201 });
    } catch (error: any) {
        console.error("[POST /api/staff]", error);
        if (error.code === 11000) {
            return NextResponse.json({ error: "Staff ID conflict — please retry" }, { status: 409 });
        }
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const [, session] = await Promise.all([
            dbConnect(),
            getServerSession(authOptions),
        ]);
        if (!session?.user || session.user.role !== "admin") {
            return NextResponse.json({ error: "Admin only" }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const staffId = searchParams.get("staffId");

        if (!staffId) {
            return NextResponse.json({ error: "staffId is required" }, { status: 400 });
        }

        const deletedStaff = await Staff.findOneAndDelete({ 
            staffId, 
            poolId: session.user.poolId 
        });

        if (!deletedStaff) {
            return NextResponse.json({ error: "Staff not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        return apiError(error);
    }
}
