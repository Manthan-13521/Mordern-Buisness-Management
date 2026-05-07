import { NextResponse } from "next/server";
import { resolveUser, AuthUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";
import { BusinessAttendance } from "@/models/BusinessAttendance";
import { requireBusinessId } from "@/lib/tenant";
import { SystemLock } from "@/models/SystemLock";
import { logger } from "@/lib/logger";
import { z } from "zod";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const AttendanceRecordSchema = z.object({
    labourId: z.string().min(1),
    status: z.enum(["present", "half_day", "absent"]),
});

const AttendanceSyncSchema = z.object({
    date: z.string().min(1, "Date is required"),
    records: z.array(AttendanceRecordSchema).min(1).max(500),
});

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
        const parsed = AttendanceSyncSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        const { date, records } = parsed.data;

        logger.debug("Business attendance sync", { businessId, userId: user.id, recordCount: records.length });

        await dbConnect();

        // 🔴 TERMINAL DEFENSE
        if (!businessId) {
            throw new Error("Tenant context lost before database operation");
        }

        // Optimized Bulk Upsert approach
        const bulkOps = records.map((rec: any) => ({
            updateOne: {
                filter: { labourId: rec.labourId, businessId, date: new Date(date) },
                update: { $set: { status: rec.status } },
                upsert: true
            }
        }));

        if (bulkOps.length > 0) {
            await BusinessAttendance.bulkWrite(bulkOps);
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

                    logger.debug("Attendance cleanup success", {
                        businessId,
                        ownerId: instanceId,
                        deletedCount: result.deletedCount,
                    });
                } catch (err: any) {
                    logger.error("Attendance cleanup failed", {
                        key: "labour_cleanup",
                        ownerId: instanceId,
                        error: err.message,
                    });
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
        logger.error("Attendance sync error", { error: error.message });
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

        if (process.env.DEBUG_ANALYTICS === "true") {
            logger.debug("Business attendance list", { businessId, userId: user.id });
        }

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

        const attendanceRaw = await BusinessAttendance.find(query)
            .select("labourId businessId date status")
            .sort({ date: -1 })
            .limit(200)
            .populate("labourId", "name")
            .lean();
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
