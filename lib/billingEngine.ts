import mongoose from "mongoose";
import { dbConnect } from "./mongodb";

/**
 * ── Billing Engine (Step 7D) ────────────────────────────────────────────────────────
 * Scans all active subscriptions where nextDueDate has lapsed.
 * Safely increases the Ledger `totalDue`, syncs the hybrid Member visual cache natively, 
 * and extends the subscription cycle.
 */
export async function processDueGenerations(poolId?: string) {
    await dbConnect();
    const { Subscription } = await import("@/models/Subscription");
    const { Ledger } = await import("@/models/Ledger");
    const { Plan } = await import("@/models/Plan");

    const now = new Date();

    const query: any = { status: "active", nextDueDate: { $lte: now } };
    if (poolId) query.poolId = poolId;

    // Use native index query [poolId, nextDueDate, status] for extreme high performance
    const dueSubscriptions = await Subscription.find(query);
    if (dueSubscriptions.length === 0) return { processed: 0 };

    let processed = 0;

    for (const sub of dueSubscriptions) {
        await processIndividualBilling(sub);
        processed++;
    }

    return { processed };
}

/**
 * ── Process Individual Billing Transaction ──
 * Atomic, transaction-bound billing for a single subscription record.
 * Designed to be called by Workers or Batch processes.
 */
export async function processIndividualBilling(sub: any) {
    if (!sub) return false;

    const { Subscription } = await import("@/models/Subscription");
    const { Ledger } = await import("@/models/Ledger");
    const { Plan } = await import("@/models/Plan");
    const { LedgerCycle } = await import("@/models/LedgerCycle");
    const { Member } = await import("@/models/Member");
    const { EntertainmentMember } = await import("@/models/EntertainmentMember");

    // Plan Change Safety (Fix 5): Apply deferred plan upgrades upon cycle boundary crossover natively
    if (sub.pendingPlanId) {
        sub.planId = sub.pendingPlanId;
        sub.pendingPlanId = undefined;
    }

    const plan = await Plan.findById(sub.planId).lean();
    if (!plan) return false;

    const price = (plan as any).price || 0;
    
    // UTC Safety (Fix 3)
    const currentCycleKey = new Date().toISOString().slice(0, 7);

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Fix 1: Hard Idempotent Billing Check
        const alreadyBilled = await LedgerCycle.findOne({ memberId: sub.memberId, cycleKey: currentCycleKey }).session(session);
        if (alreadyBilled) {
            await session.abortTransaction();
            return false;
        }

        // Fix 2: Concurrency Isolation Layer
        const writeResult = await Ledger.updateOne(
            { memberId: sub.memberId, lastBilledCycle: { $ne: currentCycleKey } },
            {
                $inc: { totalDue: price },
                $set: { lastBilledCycle: currentCycleKey }
            },
            { session }
        );

        if (writeResult.modifiedCount === 0) {
            await session.abortTransaction();
            return false;
        }

        // Recompute strict structural bounding
        let ledger = await Ledger.findOne({ memberId: sub.memberId }).session(session);
        if (ledger) {
            // Fix 4: Math structurally supports passive credits globally
            ledger.balance = Math.max(0, ledger.totalDue - ledger.totalPaid);
            ledger.creditBalance = Math.max(0, ledger.totalPaid - ledger.totalDue);
            await ledger.save({ session });
            
            // ── Update Hybrid Cache ──
            let updatedMember = await Member.findOneAndUpdate(
                { _id: sub.memberId },
                { $set: { balanceAmount: ledger.balance, cachedBalance: ledger.balance } }, // 1.2 Opt
                { session }
            );

            if (!updatedMember) {
                await EntertainmentMember.findOneAndUpdate(
                    { _id: sub.memberId },
                    { $set: { balanceAmount: ledger.balance, cachedBalance: ledger.balance } }, // 1.2 Opt
                    { session }
                );
            }
        }

        // Extend cycle forward natively with pure UTC logic
        const nextDate = new Date(sub.nextDueDate);
        nextDate.setUTCMonth(nextDate.getUTCMonth() + 1);
        sub.nextDueDate = nextDate;
        await sub.save({ session });

        // Document cycle securely
        await LedgerCycle.create([{
            memberId: sub.memberId,
            poolId: sub.poolId,
            cycleKey: currentCycleKey,
            amount: price
        }], { session });

        await session.commitTransaction();
        return true;
    } catch (e) {
        if (session.inTransaction()) await session.abortTransaction();
        console.error("Dues generation fallback failed for member:", sub.memberId, e);
        return false;
    } finally {
        session.endSession();
    }
}
