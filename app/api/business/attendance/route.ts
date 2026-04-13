import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import { BusinessAttendance } from "@/models/BusinessAttendance";
import { requireBusinessId } from "@/lib/tenant";

export const dynamic = "force-dynamic";

let isCleaning = false;

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        let businessId;
        try {
            businessId = requireBusinessId(session?.user);
        } catch (err: any) {
            return NextResponse.json({ error: err.message }, { status: err.message === "Unauthorized" ? 401 : 403 });
        }

        const body = await req.json();
        const { date, records } = body;

        if (!date || !records || !Array.isArray(records)) {
            return NextResponse.json({ error: "Invalid data" }, { status: 400 });
        }

        await dbConnect();

        // Upsert approach: remove existing for this date and business, then insert new
        // For production, a more careful update would be better, but this is clean for MVP
        const attendances = records.map((rec: any) => ({
            labourId: rec.labourId,
            businessId,
            date: new Date(date),
            status: rec.status
        }));

        // Batch operation
        for (const log of attendances) {
            await BusinessAttendance.findOneAndUpdate(
                { labourId: log.labourId, businessId, date: log.date },
                { $set: { status: log.status } },
                { upsert: true }
            );
        }

        // ── 90-Day Rolling Window Cleanup (Optimized Locked Sweep) ──
        if (!isCleaning && Math.random() < 0.05) {
            isCleaning = true;
            (async () => {
                try {
                    const ninetyDaysAgo = new Date();
                    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
                    
                    const result = await BusinessAttendance.deleteMany({ 
                        businessId, 
                        date: { $lt: ninetyDaysAgo } 
                    });

                    console.info(JSON.stringify({
                        type: "ATTENDANCE_CLEANUP_SUCCESS",
                        businessId,
                        deletedCount: result.deletedCount,
                        timestamp: new Date().toISOString()
                    }));
                } catch (err: any) {
                    console.error("Cleanup Error:", err.message);
                } finally {
                    isCleaning = false;
                }
            })();
        }

        return NextResponse.json({ success: true }, {
            headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" }
        });
    } catch (error) {
        console.error("Attendance Sync Error:", error);
        return NextResponse.json({ error: "Failed to sync attendance" }, { status: 500 });
    }
}

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        let businessId;
        try {
            businessId = requireBusinessId(session?.user);
        } catch (err: any) {
            return NextResponse.json({ error: err.message }, { status: err.message === "Unauthorized" ? 401 : 403 });
        }

        const { searchParams } = new URL(req.url);
        const date = searchParams.get("date");
        const labourId = searchParams.get("labourId");
        const from = searchParams.get("from");
        const to = searchParams.get("to");

        await dbConnect();

        const query: any = { businessId };
        if (date) {
            query.date = new Date(date);
        }
        if (labourId) {
            query.labourId = labourId;
        }
        if (from || to) {
            query.date = {};
            if (from) query.date.$gte = new Date(from);
            if (to) query.date.$lte = new Date(to);
        }

        const attendance = await BusinessAttendance.find(query).sort({ date: -1 }).populate("labourId", "name");
        return NextResponse.json(attendance, {
            headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" }
        });
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch attendance" }, { status: 500 });
    }
}
