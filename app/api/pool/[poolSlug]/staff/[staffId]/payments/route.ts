import { NextResponse } from "next/server";
import { resolveUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";
import { StaffPayment } from "@/models/StaffPayment";
import { Pool } from "@/models/Pool";
import { Hostel } from "@/models/Hostel";

export const dynamic = "force-dynamic";

async function resolveTenant(slug: string, type: "pool" | "hostel") {
  await dbConnect();
  if (type === "pool") {
    const pool = await Pool.findOne({ slug });
    if (!pool) throw new Error("Pool not found");
    return pool.poolId;
  } else {
    const hostel = await Hostel.findOne({ slug });
    if (!hostel) throw new Error("Hostel not found");
    return hostel.hostelId;
  }
}

export async function POST(req: Request, props: { params: Promise<{ poolSlug: string, staffId: string }> }) {
  try {
    const { poolSlug, staffId } = await props.params;
    const user = await resolveUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = await resolveTenant(poolSlug, "pool");

    // ── TENANT OWNERSHIP CHECK ──────────────────────────────────────────
    if (user.role !== "superadmin" && user.poolId !== tenantId) {
      return NextResponse.json({ error: "Access denied: pool mismatch" }, { status: 403 });
    }

    const { amount } = await req.json();

    const payment = new StaffPayment({
      staffId,
      poolId: tenantId,
      amount
    });

    await payment.save();

    // ── AUDIT LOG: Staff Payment Recorded ──────────────────────────
    const { logger } = await import("@/lib/logger");
    logger.audit({
        type: "STAFF_PAYMENT_RECORDED",
        userId: user.id,
        poolId: tenantId,
        meta: {
            staffId,
            amount,
            recordedBy: user.email || user.id,
        }
    });

    return NextResponse.json(payment);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}