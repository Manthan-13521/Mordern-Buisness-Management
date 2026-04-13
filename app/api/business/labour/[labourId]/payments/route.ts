import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import { BusinessLabourPayment } from "@/models/BusinessLabourPayment";
import { requireBusinessId } from "@/lib/tenant";

export const dynamic = "force-dynamic";

let isCleaning = false;

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

        await dbConnect();

        const payment = new BusinessLabourPayment({
            labourId,
            businessId,
            amount,
        });

        await payment.save();

        // ── 90-Day Rolling Window Cleanup (Optimized Locked Sweep) ──
        if (!isCleaning && Math.random() < 0.05) {
            isCleaning = true;
            (async () => {
                try {
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
                        timestamp: new Date().toISOString()
                    }));
                } catch (err: any) {
                    console.error("Cleanup Error:", err.message);
                } finally {
                    isCleaning = false;
                }
            })();
        }

        return NextResponse.json({ success: true, payment }, {
            headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" }
        });
    } catch (error) {
        console.error("Labour Payment Error:", error);
        return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
    }
}
