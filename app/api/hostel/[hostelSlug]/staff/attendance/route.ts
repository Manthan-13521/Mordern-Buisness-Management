import { NextResponse } from "next/server";
import { resolveUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";
import { HostelStaffAttendance } from "@/models/HostelStaffAttendance";
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

export async function POST(req: Request, props: { params: Promise<{ hostelSlug: string }> }) {
  try {
    const { hostelSlug } = await props.params;
    const user = await resolveUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = await resolveTenant(hostelSlug, "hostel");
    const { validateTenantAccess } = await import("@/lib/tenant");
    if (!validateTenantAccess(user, tenantId, "hostel")) {
      return NextResponse.json({ error: "Access denied: hostel mismatch" }, { status: 403 });
    }
    const { date, records } = await req.json();

    const promises = records.map(async (rec: any) => {
      // Normalize to model enum: "Present" | "Absent" (capital first letter)
      const raw = (rec.status || "").toLowerCase();
      const normalizedStatus = raw === "present" ? "Present" : raw === "half_day" ? "half_day" : raw === "absent" ? "Absent" : rec.status;
      return HostelStaffAttendance.findOneAndUpdate({ staffId: rec.labourId, hostelId: tenantId, date }, { $set: { status: normalizedStatus } }, { upsert: true });
    });

    await Promise.all(promises);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}