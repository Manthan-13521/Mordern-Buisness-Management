import { NextResponse } from "next/server";
import { resolveUser, AuthUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export async function GET(req: Request) {
    try {
        const user = await resolveUser(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        if (user.role !== "superadmin") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await dbConnect();

        const { Organization } = await import("@/models/Organization");

        // Compute the last 12 months date range
        const now = new Date();
        const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

        // Aggregate organization signups by month and module type
        // Each org has poolIds, hostelIds, businessIds arrays — use these to classify
        const monthlyGrowth = await Organization.aggregate([
            { $match: { createdAt: { $gte: twelveMonthsAgo } } },
            {
                $project: {
                    monthKey: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
                    isPool: { $cond: [{ $gt: [{ $size: { $ifNull: ["$poolIds", []] } }, 0] }, 1, 0] },
                    isHostel: { $cond: [{ $gt: [{ $size: { $ifNull: ["$hostelIds", []] } }, 0] }, 1, 0] },
                    isBusiness: { $cond: [{ $gt: [{ $size: { $ifNull: ["$businessIds", []] } }, 0] }, 1, 0] },
                }
            },
            {
                $group: {
                    _id: "$monthKey",
                    pool: { $sum: "$isPool" },
                    hostel: { $sum: "$isHostel" },
                    business: { $sum: "$isBusiness" },
                    total: { $sum: 1 },
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Build a complete 12-month timeline (fill gaps with zeroes)
        const monthMap: Record<string, { pool: number; hostel: number; business: number; active: number }> = {};
        for (let i = 0; i < 12; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            monthMap[key] = { pool: 0, hostel: 0, business: 0, active: 0 };
        }

        // Merge aggregation results into the timeline
        for (const row of monthlyGrowth) {
            if (monthMap[row._id]) {
                monthMap[row._id] = {
                    pool: row.pool || 0,
                    hostel: row.hostel || 0,
                    business: row.business || 0,
                    active: row.total || 0,
                };
            }
        }

        // Format for frontend: { month: "Jan", pool: 10, hostel: 5, business: 3, active: 18 }
        const formatted = Object.entries(monthMap).map(([key, data]) => {
            const [, monthStr] = key.split("-");
            const monthIdx = parseInt(monthStr, 10) - 1;
            return {
                month: MONTH_NAMES[monthIdx],
                pool: data.pool,
                hostel: data.hostel,
                business: data.business,
                active: data.active,
            };
        });

        return NextResponse.json(formatted, {
            headers: { "Cache-Control": "private, max-age=60, must-revalidate" }
        });
    } catch (e) {
        console.error("[Dashboard Chart API]", e);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
