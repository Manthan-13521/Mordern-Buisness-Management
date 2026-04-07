import { NextResponse } from "next/server";
import { processDueGenerations } from "@/lib/billingEngine";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    try {
        // Optional Vercel Cron verification layer protection
        const authHeader = req.headers.get("authorization");
        if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
             return NextResponse.json({ error: "Unauthorized Cron Secret" }, { status: 401 });
        }

        const { Subscription } = await import("@/models/Subscription");
        const { dbConnect } = await import("@/lib/mongodb");
        const { enqueueJob } = await import("@/lib/queue");
        const { processDueGenerations } = await import("@/lib/billingEngine");

        await dbConnect();
        const now = new Date();
        const dueSubscriptions = await Subscription.find({ 
            status: "active", 
            nextDueDate: { $lte: now } 
        }).select("_id").lean();

        if (dueSubscriptions.length === 0) {
            return NextResponse.json({ processed: 0, message: "No billing due." });
        }

        let enqueued = 0;
        let fallbackProcessed = 0;

        for (const sub of dueSubscriptions) {
            const { success, fallback } = await enqueueJob("billing", { 
                subscriptionId: sub._id.toString() 
            });

            if (success) {
                enqueued++;
            } else if (fallback) {
                // ── Prompt 2.1 Fallback ──
                // If queue fails, process synchronously to avoid missing money!
                const { processIndividualBilling } = await import("@/lib/billingEngine");
                const fullSub = await Subscription.findById(sub._id);
                if (fullSub) {
                    await processIndividualBilling(fullSub);
                    fallbackProcessed++;
                }
            }
        }
        
        return NextResponse.json({ 
            success: true,
            message: "Billing cron dispatched.", 
            enqueued,
            fallbackProcessed,
            total: dueSubscriptions.length
        }, { status: 200 });

    } catch (e) {
        console.error("Cron execution failed securely:", e);
        return NextResponse.json({ error: "Internal execution fault" }, { status: 500 });
    }
}
