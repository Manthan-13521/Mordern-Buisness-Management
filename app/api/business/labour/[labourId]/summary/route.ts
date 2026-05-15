import { NextResponse } from "next/server";
import { resolveUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";
import { BusinessAttendance } from "@/models/BusinessAttendance";
import { BusinessLabourPayment } from "@/models/BusinessLabourPayment";
import { BusinessLabour } from "@/models/BusinessLabour";
import { requireBusinessId } from "@/lib/tenant";
import { logger } from "@/lib/logger";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

/**
 * GET /api/business/labour/[labourId]/summary
 * Returns last 3 months attendance + payment summary for a single staff member.
 * Designed for lazy-loading — only called when a staff row is expanded.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ labourId: string }> }
) {
  try {
    const { labourId } = await params;
    const user = await resolveUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let businessId: string;
    try {
      businessId = requireBusinessId(user);
    } catch (err: any) {
      return NextResponse.json(
        { error: err.message },
        { status: err.message === "Unauthorized" ? 401 : 403 }
      );
    }

    await dbConnect();

    // Verify this labour belongs to this business
    const labour = await BusinessLabour.findOne({
      _id: labourId,
      businessId,
      isActive: true,
    });
    if (!labour) {
      return NextResponse.json(
        { error: "Staff not found" },
        { status: 404 }
      );
    }

    const labourObjectId = new mongoose.Types.ObjectId(labourId);

    // Calculate date range: start of 3 months ago to now
    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    // Start of current month's last day (end of range)
    const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Fetch attendance for last 3 months
    const attendance = await BusinessAttendance.find({
      labourId: labourObjectId,
      businessId,
      date: { $gte: threeMonthsAgo, $lte: endOfCurrentMonth },
    }).lean();

    // Fetch payments for last 3 months
    const payments = await BusinessLabourPayment.find({
      labourId: labourObjectId,
      businessId,
      createdAt: { $gte: threeMonthsAgo, $lte: endOfCurrentMonth },
    }).lean();

    // Group by month
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const salaryPerDay = labour.salary || 0;

    // Build summary for each of the last 3 months
    const months: Array<{
      month: string;
      year: number;
      presentDays: number;
      halfDays: number;
      earned: number;
      paid: number;
      status: "CLEARED" | "DUE";
      dueAmount: number;
      advanceAmount: number;
    }> = [];

    for (let i = 2; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const targetMonth = targetDate.getMonth();
      const targetYear = targetDate.getFullYear();

      // Count present & half days for this month
      let presentDays = 0;
      let halfDays = 0;
      attendance.forEach((a: any) => {
        const d = new Date(a.date);
        if (d.getMonth() === targetMonth && d.getFullYear() === targetYear) {
          if (a.status === "present") presentDays++;
          else if (a.status === "half_day") halfDays++;
        }
      });

      // Calculate earned
      const earned = (presentDays * salaryPerDay) + (halfDays * 0.5 * salaryPerDay);

      // Sum payments for this month
      let paid = 0;
      payments.forEach((p: any) => {
        const d = new Date(p.createdAt);
        if (d.getMonth() === targetMonth && d.getFullYear() === targetYear) {
          paid += p.amount;
        }
      });

      const dueAmount = Math.max(0, earned - paid);
      const advanceAmount = Math.max(0, paid - earned);
      const status: "CLEARED" | "DUE" = paid >= earned ? "CLEARED" : "DUE";

      months.push({
        month: monthNames[targetMonth],
        year: targetYear,
        presentDays,
        halfDays,
        earned: Math.round(earned),
        paid: Math.round(paid),
        status,
        dueAmount: Math.round(dueAmount),
        advanceAmount: Math.round(advanceAmount),
      });
    }

    return NextResponse.json(
      {
        data: {
          labourId,
          name: labour.name,
          salaryPerDay,
          months,
        },
      },
      {
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" },
      }
    );
  } catch (error: any) {
    logger.error("Summary API error", { error: error?.message });
    return NextResponse.json(
      {
        error: "Failed to fetch summary",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
