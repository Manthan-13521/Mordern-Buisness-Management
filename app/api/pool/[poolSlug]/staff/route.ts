import { NextResponse } from "next/server";
import { resolveUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";
import { Staff } from "@/models/Staff";
import { StaffAttendance } from "@/models/StaffAttendance";
import { StaffPayment } from "@/models/StaffPayment";
import { StaffAdvance } from "@/models/StaffAdvance";
import { Pool } from "@/models/Pool";
import { Hostel } from "@/models/Hostel";
import mongoose from "mongoose";

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

export async function GET(req: Request, props: { params: Promise<{ poolSlug: string }> }) {
  try {
    const { poolSlug } = await props.params;
    const user = await resolveUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = await resolveTenant(poolSlug, "pool");

    const now = new Date();
    const currentMonthKey = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");

    const laboursRaw = await Staff.aggregate([
      { $match: { poolId: tenantId, isActive: { $ne: false } } },
      {
        $lookup: {
          from: "staffattendances",
          let: { labId: "$_id", tId: "$poolId" },
          pipeline: [
            { $match: { 
              $expr: { 
                $and: [
                  { $eq: ["$staffId", { $toString: "$$labId" }] },
                  { $eq: ["$poolId", "$$tId"] }
                ]
              } 
            }},
            { $sort: { timestamp: -1, date: -1 } }
          ],
          as: "recentAttendance"
        }
      },
      {
        $lookup: {
          from: "staffpayments",
          let: { labId: "$_id", tId: "$poolId" },
          pipeline: [
            { $match: { 
              $expr: { 
                $and: [
                  { $eq: ["$staffId", "$$labId"] },
                  { $eq: ["$poolId", "$$tId"] }
                ]
              } 
            }},
            { $sort: { createdAt: -1 } }
          ],
          as: "payments"
        }
      },
      {
        $lookup: {
          from: "staffadvances",
          let: { labId: "$_id", tId: "$poolId" },
          pipeline: [
            { $match: { 
              $expr: { 
                $and: [
                  { $eq: ["$staffId", "$$labId"] },
                  { $eq: ["$poolId", "$$tId"] },
                  { $eq: ["$month", currentMonthKey] }
                ]
              } 
            }}
          ],
          as: "advances"
        }
      },
      {
        $addFields: {
          advancePaid: { $ifNull: [{ $arrayElemAt: ["$advances.amount", 0] }, 0] }
        }
      },
      { $sort: { name: 1 } }
    ]);

    return NextResponse.json(laboursRaw, { headers: { "Cache-Control": "no-store" } });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request, props: { params: Promise<{ poolSlug: string }> }) {
  try {
    const { poolSlug } = await props.params;
    const user = await resolveUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = await resolveTenant(poolSlug, "pool");
    const body = await req.json();
    const { name, role, salary, phone } = body;

    const newStaff = new Staff({
      staffId: new mongoose.Types.ObjectId().toString(),
      name,
      role,
      salary,
      phone,
      poolId: tenantId,
      isActive: true
    });

    await newStaff.save();
    return NextResponse.json(newStaff, { status: 201 });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}