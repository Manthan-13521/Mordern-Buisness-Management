import { NextResponse } from "next/server";
import { resolveUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";
import { StaffAttendance } from "@/models/StaffAttendance";
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

export async function POST(req: Request, props: { params: Promise<{ poolSlug: string }> }) {
  try {
    const { poolSlug } = await props.params;
    const user = await resolveUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = await resolveTenant(poolSlug, "pool");

    // ── TENANT OWNERSHIP CHECK ──────────────────────────────────────────
    if (user.role !== "superadmin" && user.poolId !== tenantId) {
      return NextResponse.json({ error: "Access denied: pool mismatch" }, { status: 403 });
    }

    const { date, records } = await req.json();

    const promises = records.map(async (rec: any) => {
      return StaffAttendance.findOneAndUpdate(
        { staffId: rec.labourId, poolId: tenantId, date },
        { $set: { status: rec.status, method: "manual", type: "checkIn", timestamp: new Date() } },
        { upsert: true, new: true }
      );
    });

    await Promise.all(promises);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}