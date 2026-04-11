import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const [session] = await Promise.all([getServerSession(authOptions), dbConnect()]);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });

        const poolId = (session.user as any).poolId;
        if (!poolId) return NextResponse.json({ error: "No pool assigned" }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });

        const { Payment } = await import("@/models/Payment");

        const planRevenue = await Payment.aggregate([
            { $match: { poolId, status: "success" } },
            {
                $group: {
                    _id: "$planId",
                    revenue: { $sum: "$amount" },
                    count: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: "plans",
                    localField: "_id",
                    foreignField: "_id",
                    as: "plan",
                    pipeline: [{ $project: { name: 1 } }]
                }
            },
            { $unwind: { path: "$plan", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 0,
                    planId: "$_id",
                    planName: { $ifNull: ["$plan.name", "Unknown Plan"] },
                    revenue: 1,
                    count: 1
                }
            },
            { $sort: { revenue: -1 } }
        ]);

        return NextResponse.json(planRevenue, {
            headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=60" }
        });

    } catch (error) {
        console.error("[GET /api/analytics/plan-revenue]", error);
        return NextResponse.json({ error: "Server error" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}
