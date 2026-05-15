import { NextResponse } from "next/server";
import { resolveUser, AuthUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";
import { BusinessLabourPayment } from "@/models/BusinessLabourPayment";
import { requireBusinessId } from "@/lib/tenant";
import { SystemLock } from "@/models/SystemLock";
import { financialWriteLimiter } from "@/lib/rateLimiter";
import { auditLog } from "@/lib/auditLog";
import { logger } from "@/lib/logger";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ labourId: string }> }) {
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

        // 🟠 RATE LIMITING
        const ip = req.headers.get("x-forwarded-for") || "unknown";
        const rl = financialWriteLimiter.checkTenant(user.businessId || "unknown", ip);
        if (!rl.allowed) {
            return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429 });
        }

        const { labourId } = await params;
        const body = await req.json();
        const { amount } = body;

        // "Reject amount <= 0" rule strictly enforced
        if (!amount || amount <= 0) {
            return NextResponse.json({ error: "Invalid payment amount" }, { status: 400 });
        }

        logger.debug("Business labour payment create", { businessId, labourId, userId: user.id });

        await dbConnect();

        // 🔴 TERMINAL DEFENSE
        if (!businessId) {
            throw new Error("Tenant context lost before database operation");
        }

        const payment = new BusinessLabourPayment({
            labourId,
            businessId,
            amount,
        });

        await payment.save();

        auditLog.financial({ businessId, userId: user.id, action: "LABOUR_PAYMENT", details: { labourId, amount } });

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
                    
                    const result = await BusinessLabourPayment.deleteMany({ 
                        businessId, 
                        createdAt: { $lt: ninetyDaysAgo } 
                    });

                    logger.debug("Payment cleanup success", {
                        businessId,
                        ownerId: instanceId,
                        deletedCount: result.deletedCount,
                    });
                } catch (err: any) {
                    logger.error("Payment cleanup failed", {
                        key: "labour_cleanup",
                        ownerId: instanceId,
                        error: err.message,
                    });
                }
            })();
        }

        return NextResponse.json({ 
            data: payment,
            meta: {
                message: "Payment recorded successfully",
                businessId,
                timestamp: new Date().toISOString()
            }
        }, {
            headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" }
        });
    } catch (error: any) {
        logger.error("Labour payment error", { error: error?.message });
        return NextResponse.json({ 
            data: null,
            meta: {
                error: "Failed to record payment",
                details: error.message,
                timestamp: new Date().toISOString()
            }
        }, { status: 500 });
    }
}
