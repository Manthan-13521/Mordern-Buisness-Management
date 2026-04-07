import { NextResponse } from "next/server";
import { evaluateAutoBlock } from "@/lib/defaulterEngine";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    try {
        const authHeader = req.headers.get("authorization");
        if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
             return NextResponse.json({ error: "Unauthorized Cron Secret" }, { status: 401 });
        }

        const { dbConnect } = await import("@/lib/mongodb");
        await dbConnect();

        const { Subscription } = await import("@/models/Subscription");
        const { enqueueJob } = await import("@/lib/queue");
        
        const now = new Date();
        const blockThreshold = new Date();
        blockThreshold.setDate(blockThreshold.getDate() - 15);

        // Fetch IDs only
        const lapsedSubs = await Subscription.find({ 
            status: "active", 
            nextDueDate: { $lt: blockThreshold } 
        }).select("memberId").lean();

        let enqueued = 0;
        let fallbackProcessed = 0;

        for (const sub of lapsedSubs) {
            const { success, fallback } = await enqueueJob("defaulter", { 
                memberId: sub.memberId.toString() 
            });

            if (success) {
                enqueued++;
            } else if (fallback) {
                // ── Prompt 2.4 Fallback ──
                console.log("Queue fallback triggered");
                const { resolveDefaulterState } = await import("@/lib/defaulterEngine");
                const { Member } = await import("@/models/Member");
                const { AccessLog } = await import("@/models/AccessLog");

                const ledger = await import("@/models/Ledger").then(m => m.Ledger.findOne({ memberId: sub.memberId }).lean());
                if (ledger && (ledger as any).balance > 0) {
                    const result = await Member.updateOne(
                        { 
                            _id: sub.memberId, 
                            accessStatus: { $nin: ["blocked", "suspended"] }, 
                            manualOverride: { $ne: true }
                        },
                        { $set: { accessStatus: "blocked", blockedAt: now, accessState: "blocked" } }
                    );

                    if (result.modifiedCount > 0) {
                        fallbackProcessed++;
                        await AccessLog.create({
                            memberId: sub.memberId,
                            poolId: (sub as any).poolId,
                            action: "auto_block",
                            reason: "defaulter",
                            previousStatus: "active",
                            newStatus: "blocked"
                        });
                    }
                }
            }
        }
        
        if (enqueued > 0) console.log(`Queued ${enqueued} jobs`);
        if (fallbackProcessed > 0) console.log("Fallback cron execution");

        return NextResponse.json({ 
            success: true,
            message: "Auto-block cron dispatched.", 
            enqueued,
            fallbackProcessed,
            total: lapsedSubs.length
        }, { status: 200 });

    } catch (e) {
        console.error("Auto-block cron failed securely:", e);
        return NextResponse.json({ error: "Internal execution fault" }, { status: 500 });
    }
}
