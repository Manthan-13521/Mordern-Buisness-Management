import mongoose from "mongoose";

export type DefaulterStatus = "active" | "warning" | "blocked";

export interface DefaulterState {
    isDefaulter: boolean;
    overdueDays: number;
    defaulterStatus: DefaulterStatus;
}

/**
 * Computes logical bounds of a member's business condition explicitly based on pure thresholds.
 */
export function computeDefaulterStatus(overdueDays: number): DefaulterStatus {
    if (overdueDays > 15) return "blocked";
    if (overdueDays > 5) return "warning";
    return "active"; // 0-5 days grace period gracefully
}

/**
 * Mathematically derives the holistic defaulter state directly interrogating active Subscriptions and Ledgers.
 */
export async function resolveDefaulterState(memberId: string | mongoose.Types.ObjectId, poolId: string): Promise<DefaulterState> {
    const defaultState: DefaulterState = { isDefaulter: false, overdueDays: 0, defaulterStatus: "active" };
    
    if (!memberId || !poolId) return defaultState;
    const mId = typeof memberId === "string" ? new mongoose.Types.ObjectId(memberId) : memberId;

    try {
        const { Subscription } = await import("@/models/Subscription");
        const { Ledger } = await import("@/models/Ledger");

        const [subscription, ledger] = await Promise.all([
            Subscription.findOne({ memberId: mId, status: 'active', poolId }).lean(),
            Ledger.findOne({ memberId: mId, poolId }).lean()
        ]);

        if (!subscription || !ledger) return defaultState;

        const ledgerObj: any = ledger;
        const subObj: any = subscription;

        // Is balance positively due and cycle lapsed structurally?
        const balance = ledgerObj.balance || 0;
        const now = new Date();
        const nextDueDate = new Date(subObj.nextDueDate);

        if (balance > 0 && nextDueDate < now) {
            const msDue = now.getTime() - nextDueDate.getTime();
            const overdueDays = Math.floor(msDue / (1000 * 60 * 60 * 24));
            
            return {
                isDefaulter: true,
                overdueDays,
                defaulterStatus: computeDefaulterStatus(overdueDays)
            };
        }

        return defaultState;
    } catch(e) {
        console.error("Defaulter engine resolution fault:", e);
        return defaultState;
    }
}

export async function evaluateAutoBlock() {
    const defaultState = { processed: 0 };
    try {
        const { dbConnect } = await import("./mongodb");
        await dbConnect();

        const { Subscription } = await import("@/models/Subscription");
        const { Ledger } = await import("@/models/Ledger");
        const { Member } = await import("@/models/Member");
        const { AccessLog } = await import("@/models/AccessLog");

        const now = new Date();
        const blockThreshold = new Date();
        blockThreshold.setDate(blockThreshold.getDate() - 15);

        // Find subscriptions lapsed > 15 days
        const lapsedSubs = await Subscription.find({ 
            status: "active", 
            nextDueDate: { $lt: blockThreshold } 
        }).lean();

        let processedCount = 0;
        
        for (const sub of lapsedSubs) {
            const ledger = await Ledger.findOne({ memberId: sub.memberId }).lean();
            if (ledger && (ledger as any).balance > 0) {
                // Determine member's current status (could be fetched if needed, but Mongo handles predicate)
                // Use robust identical update exactly as user specified
                const subObj: any = sub;
                const result = await Member.updateOne(
                    { 
                        _id: subObj.memberId, 
                        accessStatus: { $nin: ["blocked", "suspended"] }, 
                        manualOverride: { $ne: true }
                    },
                    { $set: { accessStatus: "blocked", blockedAt: now, accessState: "blocked" } }
                );

                if (result.modifiedCount > 0) {
                    processedCount++;
                    await AccessLog.create({
                        memberId: subObj.memberId,
                        poolId: subObj.poolId,
                        action: "auto_block",
                        reason: "defaulter",
                        previousStatus: "active",
                        newStatus: "blocked"
                    });
                }
            }
        }
        return { processed: processedCount };
    } catch (e) {
        console.error("Auto block engine fault:", e);
        return defaultState;
    }
}
