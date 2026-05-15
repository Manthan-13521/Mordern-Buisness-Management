import { NextResponse } from "next/server";
import { resolveUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";
import { HostelStaffAttendance } from "@/models/HostelStaffAttendance";
import { Pool } from "@/models/Pool";
import { Hostel } from "@/models/Hostel";
import { checkRateLimit, getClientIp, rateLimitHeaders } from "@/lib/rateLimit";
import { isDuplicate } from "@/lib/idempotency";

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

    // ── RATE LIMITING ──
    const ip = getClientIp(req);
    const { allowed, limit, remaining } = checkRateLimit(ip, "/api/hostel/staff/attendance", "POST");
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait." },
        { status: 429, headers: rateLimitHeaders(limit, remaining) }
      );
    }

    const { date, records } = await req.json();

    // ── IDEMPOTENCY: Prevent double submission for same date (10s window) ──
    const dedupeKey = `attendance:${tenantId}:${date}`;
    if (isDuplicate(dedupeKey, 10_000)) {
      return NextResponse.json({ success: true, message: "Already processed" });
    }

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