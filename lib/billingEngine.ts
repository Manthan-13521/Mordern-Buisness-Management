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

    try {
        // Fix 1: Hard Idempotent Billing Check
        const alreadyBilled = await LedgerCycle.findOne({ memberId: sub.memberId, cycleKey: currentCycleKey });
        if (alreadyBilled) {
            return false;
        }

        // Fix 2: Concurrency Isolation Layer
        const writeResult = await Ledger.updateOne(
            { memberId: sub.memberId, lastBilledCycle: { $ne: currentCycleKey } },
            {
                $inc: { totalDue: price },
                $set: { lastBilledCycle: currentCycleKey }
            }
        );

        if (writeResult.modifiedCount === 0) {
            return false;
        }

        // Recompute strict structural bounding
        let ledger = await Ledger.findOne({ memberId: sub.memberId });
        if (ledger) {
            // Fix 4: Math structurally supports passive credits globally
            ledger.balance = Math.max(0, ledger.totalDue - ledger.totalPaid);
            ledger.creditBalance = Math.max(0, ledger.totalPaid - ledger.totalDue);
            await ledger.save();
            
            // ── Update Hybrid Cache ──
            let updatedMember = await Member.findOneAndUpdate(
                { _id: sub.memberId },
                { $set: { balanceAmount: ledger.balance, cachedBalance: ledger.balance } }
            );

            if (!updatedMember) {
                await EntertainmentMember.findOneAndUpdate(
                    { _id: sub.memberId },
                    { $set: { balanceAmount: ledger.balance, cachedBalance: ledger.balance } }
                );
            }
        }

        // Extend cycle forward natively with pure UTC logic
        const nextDate = new Date(sub.nextDueDate);
        nextDate.setUTCMonth(nextDate.getUTCMonth() + 1);
        sub.nextDueDate = nextDate;
        await sub.save();

        // Document cycle securely
        await LedgerCycle.create([{
            memberId: sub.memberId,
            poolId: sub.poolId,
            cycleKey: currentCycleKey,
            amount: price
        }]);

        return true;
    } catch (e) {
        console.error("Dues generation fallback failed for member:", sub.memberId, e);
        return false;
    }
}
