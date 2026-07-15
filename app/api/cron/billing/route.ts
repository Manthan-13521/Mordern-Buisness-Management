import { NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/requireCronAuth";
import { requestContext } from "@/lib/requestContext";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {

        const requestId = req ? (req.headers.get("x-request-id") || crypto.randomUUID()) : crypto.randomUUID();
        const clientIp = req ? (req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown") : "unknown";
        const routePath = req ? new URL(req.url).pathname : "unknown";
        const requestMethod = "GET";

        return requestContext.run({
            requestId,
            ip: clientIp,
            route: routePath,
            method: requestMethod,
            startTime: Date.now()
        }, async () => {
            try {
            const authError = requireCronAuth(req);
            if (authError) return authError;

            const { Subscription } = await import("@/models/Subscription");
            const { dbConnect } = await import("@/lib/mongodb");
            const { enqueueJob } = await import("@/lib/queue");

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
        });
            
}
