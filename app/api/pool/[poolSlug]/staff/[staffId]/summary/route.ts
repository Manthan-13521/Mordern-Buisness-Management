import { NextResponse } from "next/server";
import { resolveUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";
import { Staff } from "@/models/Staff";
import { StaffAttendance } from "@/models/StaffAttendance";
import { StaffPayment } from "@/models/StaffPayment";
import { Pool } from "@/models/Pool";
import { Hostel } from "@/models/Hostel";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

async function resolveTenant(slug: string, type: "pool" | "hostel") {
  await dbConnect();
  if (type === "pool") {
    const pool = await Pool.findOne({ slug }).lean();
    if (!pool) throw new Error("Pool not found");
    return pool.poolId;
  } else {
    const hostel = await Hostel.findOne({ slug }).lean();
    if (!hostel) throw new Error("Hostel not found");
    return hostel.hostelId;
  }
}

export async function GET(req: Request, props: { params: Promise<{ poolSlug: string, staffId: string }> }) {
  try {
    const { poolSlug, staffId } = await props.params;
    const user = await resolveUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = await resolveTenant(poolSlug, "pool");

    // ── TENANT OWNERSHIP CHECK ──────────────────────────────────────────
    if (user.role !== "superadmin" && user.poolId !== tenantId) {
      return NextResponse.json({ error: "Access denied: pool mismatch" }, { status: 403 });
    }

    const staff = await Staff.findOne({ _id: staffId, poolId: tenantId }).lean();
    if (!staff) return NextResponse.json({ error: "Staff not found" }, { status: 404 });

    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const attendance = await StaffAttendance.find({
      staffId: staffId,
      poolId: tenantId,
      timestamp: { $gte: threeMonthsAgo, $lte: endOfCurrentMonth }
    }).lean();

    const payments = await StaffPayment.find({
      staffId: new mongoose.Types.ObjectId(staffId),
      poolId: tenantId,
      createdAt: { $gte: threeMonthsAgo, $lte: endOfCurrentMonth }
    }).lean();

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const salaryPerDay = staff.salary || 0;

    const months = [];
    for (let i = 2; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const targetMonth = targetDate.getMonth();
      const targetYear = targetDate.getFullYear();

      let presentDays = 0;
      let halfDays = 0;
      attendance.forEach((a: any) => {
        const d = new Date(a.date || a.timestamp || a.createdAt);
        if (d.getMonth() === targetMonth && d.getFullYear() === targetYear) {
          if (a.status === "Present" || a.status === "present") presentDays++;
          else if (a.status === "half_day") halfDays++;
        }
      });

      const earned = (presentDays * salaryPerDay) + (halfDays * 0.5 * salaryPerDay);

      let paid = 0;
      payments.forEach((p: any) => {
        const d = new Date(p.createdAt);
        if (d.getMonth() === targetMonth && d.getFullYear() === targetYear) {
          paid += p.amount;
        }
      });

      const dueAmount = Math.max(0, earned - paid);
      const advanceAmount = Math.max(0, paid - earned);
      months.push({
        month: monthNames[targetMonth],
        year: targetYear,
        presentDays,
        halfDays,
        earned: Math.round(earned),
        paid: Math.round(paid),
        status: paid >= earned ? "CLEARED" : "DUE",
        dueAmount: Math.round(dueAmount),
        advanceAmount: Math.round(advanceAmount),
      });
    }

    return NextResponse.json({
      data: {
        labourId: staffId,
        name: staff.name,
        salaryPerDay,
        months,
      }
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}