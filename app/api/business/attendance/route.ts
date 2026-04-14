import { NextResponse } from "next/server";
import { resolveUser, AuthUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";
import { BusinessAttendance } from "@/models/BusinessAttendance";
import { requireBusinessId } from "@/lib/tenant";
import { SystemLock } from "@/models/SystemLock";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    try {
        const user = await resolveUser(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        let businessId;
        try {
            businessId = requireBusinessId(user);
        } catch (err: any) {
            return NextResponse.json({ error: err.message }, { status: err.message === "Unauthorized" ? 401 : 403 });
        }

        const body = await req.json();
        const { date, records } = body;

        if (!date || !records || !Array.isArray(records)) {
            return NextResponse.json({ error: "Invalid data" }, { status: 400 });
        }

        // 🟢 STRUCTURED AUDIT LOGGING
        console.info(JSON.stringify({
            type: "BUSINESS_ATTENDANCE_SYNC",
            businessId,
            userId: user.id,
            route: "/api/business/attendance",
            method: "POST",
            timestamp: new Date().toISOString()
        }));

        await dbConnect();

        // 🔴 TERMINAL DEFENSE
        if (!businessId) {
            throw new Error("Tenant context lost before database operation");
        }

        // Upsert approach: remove existing for this date and business, then insert new
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

        // ── 90-Day Rolling Window Cleanup (Distributed Atomic Locked Sweep) ──
        if (Math.random() < 0.05) {
            (async () => {
                const instanceId = crypto.randomUUID();
                try {
                    const now = new Date();
                    // 🟡 ATOMIC LOCK ACQUISITION WITH OWNERSHIP
                    const lock = await SystemLock.findOneAndUpdate(
                        { 
                            key: "labour_cleanup", 
                            $or: [
                                { expiresAt: { $lt: now } }, 
                                { expiresAt: { $exists: false } }
                            ] 
                        },
                        { 
                            $set: { 
                                key: "labour_cleanup", 
                                ownerId: instanceId,
                                expiresAt: new Date(now.getTime() + 60000) 
                            } 
                        },
                        { upsert: true, new: true, rawResult: true }
                    ).catch(err => {
                        if (err.code === 11000) return null; // Duplicate key (lock held)
                        throw err;
                    });

                    // Verify we actually own this lock user
                    const lockDoc = (lock as any)?.value;
                    if (!lock || (lockDoc && lockDoc.ownerId !== instanceId)) {
                        return;
                    }

                    const ninetyDaysAgo = new Date();
                    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
                    
                    const result = await BusinessAttendance.deleteMany({ 
                        businessId, 
                        date: { $lt: ninetyDaysAgo } 
                    });

                    console.info(JSON.stringify({
                        type: "ATTENDANCE_CLEANUP_SUCCESS",
                        businessId,
                        ownerId: instanceId,
                        deletedCount: result.deletedCount,
                        route: "/api/business/attendance",
                        method: "POST",
                        timestamp: new Date().toISOString()
                    }));
                } catch (err: any) {
                    console.error(JSON.stringify({
                        type: "CLEANUP_FAILED",
                        key: "labour_cleanup",
                        ownerId: instanceId,
                        error: err.message,
                        timestamp: new Date().toISOString()
                    }));
                }
            })();
        }

        return NextResponse.json({ 
            data: { success: true },
            meta: {
                message: "Attendance synced successfully",
                businessId,
                timestamp: new Date().toISOString()
            }
        }, {
            headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" }
        });
    } catch (error: any) {
        console.error("Attendance Sync Error:", error);
        return NextResponse.json({ 
            data: null,
            meta: {
                error: "Failed to sync attendance",
                details: error.message,
                timestamp: new Date().toISOString()
            }
        }, { status: 500 });
    }
}

export async function GET(req: Request) {
    try {
        const user = await resolveUser(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        let businessId;
        try {
            businessId = requireBusinessId(user);
        } catch (err: any) {
            return NextResponse.json({ error: err.message }, { status: err.message === "Unauthorized" ? 401 : 403 });
        }

        // 🟢 STRUCTURED AUDIT LOGGING
        console.info(JSON.stringify({
            type: "BUSINESS_ATTENDANCE_LIST",
            businessId,
            userId: user.id,
            route: "/api/business/attendance",
            method: "GET",
            timestamp: new Date().toISOString()
        }));

        const { searchParams } = new URL(req.url);
        const date = searchParams.get("date");
        const labourId = searchParams.get("labourId");
        const from = searchParams.get("from");
        const to = searchParams.get("to");

        await dbConnect();

        // 🔴 TERMINAL DEFENSE
        if (!businessId) {
            throw new Error("Tenant context lost before query execution");
        }

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

        const attendanceRaw = await BusinessAttendance.find(query).sort({ date: -1 }).populate("labourId", "name");
        const attendance = Array.isArray(attendanceRaw) ? attendanceRaw : [];

        return NextResponse.json({
            data: attendance,
            meta: {
                count: attendance.length,
                businessId,
                timestamp: new Date().toISOString()
            }
        }, {
            headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" }
        });
    } catch (error: any) {
        return NextResponse.json({ 
            data: [],
            meta: {
                error: "Failed to fetch attendance",
                details: error.message,
                timestamp: new Date().toISOString()
            }
        }, { status: 500 });
    }
}
