import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import { BusinessLabourPayment } from "@/models/BusinessLabourPayment";
import { requireBusinessId } from "@/lib/tenant";
import { SystemLock } from "@/models/SystemLock";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ labourId: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        let businessId;
        try {
            businessId = requireBusinessId(session?.user);
        } catch (err: any) {
            return NextResponse.json({ error: err.message }, { status: err.message === "Unauthorized" ? 401 : 403 });
        }

        const { labourId } = await params;
        const body = await req.json();
        const { amount } = body;

        // "Reject amount <= 0" rule strictly enforced
        if (!amount || amount <= 0) {
            return NextResponse.json({ error: "Invalid payment amount" }, { status: 400 });
        }

        // 🟢 STRUCTURED AUDIT LOGGING
        console.info(JSON.stringify({
            type: "BUSINESS_LABOUR_PAYMENT_CREATE",
            businessId,
            labourId,
            userId: session?.user?.id,
            route: `/api/business/labour/${labourId}/payments`,
            method: "POST",
            timestamp: new Date().toISOString()
        }));

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

        // ── 90-Day Rolling Window Cleanup (Distributed Locked Sweep) ──
        if (Math.random() < 0.05) {
            (async () => {
                try {
                    const now = new Date();
                    // Attempt to acquire distributed lock (1 min TTL)
                    const lock = await SystemLock.findOneAndUpdate(
                        { 
                            key: "labour_cleanup", 
                            $or: [{ expiresAt: { $lt: now } }, { expiresAt: { $exists: false } }] 
                        },
                        { $set: { key: "labour_cleanup", expiresAt: new Date(now.getTime() + 60000) } },
                        { upsert: true, new: true }
                    ).catch(err => (err.code === 11000 ? null : Promise.reject(err)));

                    if (!lock) return; // Lock held by another instance

                    const ninetyDaysAgo = new Date();
                    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
                    
                    const result = await BusinessLabourPayment.deleteMany({ 
                        businessId, 
                        createdAt: { $lt: ninetyDaysAgo } 
                    });

                    console.info(JSON.stringify({
                        type: "PAYMENT_CLEANUP_SUCCESS",
                        businessId,
                        deletedCount: result.deletedCount,
                        route: `/api/business/labour/${labourId}/payments`,
                        method: "POST",
                        timestamp: new Date().toISOString()
                    }));
                } catch (err: any) {
                    console.error("Cleanup Error:", err.message);
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
        console.error("Payment Error:", error);
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
