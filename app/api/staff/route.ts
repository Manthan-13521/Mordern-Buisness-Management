import { NextRequest, NextResponse } from "next/server";
import { resolveUser, AuthUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";
import { Staff } from "@/models/Staff";

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
        const [, user] = await Promise.all([
            dbConnect(),
            resolveUser(req),
        ]);
        if (!user) return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });

        const { searchParams } = new URL(req.url);
        const page  = Math.max(1, Number(searchParams.get("page")  ?? 1));
        const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? 20)));
        const search = searchParams.get("search") ?? "";
        const poolId = user.role === "superadmin"
            ? (searchParams.get("poolId") ?? "")
            : (user.poolId ?? "");

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
        return NextResponse.json({ error: "Server error" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}

/**
 * POST /api/staff
 * Create a new staff member.
 * Body: { name, phone, role, faceScanEnabled? }
 */
export async function POST(req: NextRequest) {
    try {
        const [, user] = await Promise.all([
            dbConnect(),
            resolveUser(req),
        ]);
        if (!user || user.role !== "admin") {
            return NextResponse.json({ error: "Admin only" }, {  status: 403 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        const body = await req.json();
        const parsed = StaffCreateSchema.parse(body);
        const { name, phone, role } = parsed;

        const staffId = generateStaffId(role);
        const staff = await Staff.create({
            staffId,
            poolId: user.poolId,
            name:   name.trim(),
            phone:  phone.trim(),
            role,
        });

        // ── AUDIT LOG: Staff Created ─────────────────────────────────
        const { logger } = await import("@/lib/logger");
        logger.audit({
            type: "ADMIN_ACTION",
            userId: user.id,
            poolId: user.poolId,
            meta: {
                action: "STAFF_CREATED",
                staffId: staff.staffId,
                staffName: staff.name,
                role: staff.role,
                createdBy: user.email || user.id,
            }
        });

        return NextResponse.json(staff, {  status: 201 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    } catch (error: any) {
        console.error("[POST /api/staff]", error);
        if (error.code === 11000) {
            return NextResponse.json({ error: "Staff ID conflict — please retry" }, {  status: 409 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }
        return NextResponse.json({ error: "Server error" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const [, user] = await Promise.all([
            dbConnect(),
            resolveUser(req),
        ]);
        if (!user || user.role !== "admin") {
            return NextResponse.json({ error: "Admin only" }, {  status: 403 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        const { searchParams } = new URL(req.url);
        const staffId = searchParams.get("staffId");

        if (!staffId) {
            return NextResponse.json({ error: "staffId is required" }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        const deletedStaff = await Staff.findOneAndDelete({ 
            staffId, 
            poolId: user.poolId 
        });

        if (!deletedStaff) {
            return NextResponse.json({ error: "Staff not found" }, {  status: 404 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        // ── AUDIT LOG: Staff Deleted ─────────────────────────────────
        const { logger } = await import("@/lib/logger");
        logger.audit({
            type: "ADMIN_ACTION",
            userId: user.id,
            poolId: user.poolId,
            meta: {
                action: "STAFF_DELETED",
                staffId: deletedStaff.staffId,
                staffName: deletedStaff.name,
                deletedBy: user.email || user.id,
            }
        });

        return NextResponse.json({ success: true }, {  status: 200 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    } catch (error) {
        return apiError(error);
    }
}
