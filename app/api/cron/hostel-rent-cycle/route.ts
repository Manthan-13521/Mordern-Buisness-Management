import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { HostelMember } from "@/models/HostelMember";
import { HostelPaymentLog } from "@/models/HostelPaymentLog";
import { CronLog } from "@/models/CronLog";
import { User } from "@/models/User";
import { resolveSubscriptionState, isReadOnlyMode, isSubscriptionLocked } from "@/lib/subscriptionState";
import { withHealthcheck } from "@/lib/healthchecks";


export const dynamic = "force-dynamic";

async function executeRentCycle() {
    await dbConnect();
        
    // Find all active members who are due today or earlier
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    let processed = 0;
    const allTransactions: any[] = [];
    const BATCH_SIZE = 500;
    // How many member.save() calls to run in parallel — distinct members, no conflict
    const SAVE_CONCURRENCY = 10;

    // ── Batch loop: process 500 members at a time to prevent Vercel timeouts ──
    let hasMore = true;
    const hostelSubscriptionCache = new Map<string, boolean>();

    while (hasMore) {
        const activeMembersDue = await HostelMember.find({
            status: "active",
            isDeleted: false,
            due_date: { $lte: new Date(today.getTime() + 24 * 60 * 60 * 1000) }
        }).limit(BATCH_SIZE);

        if (activeMembersDue.length === 0) {
            hasMore = false;
            break;
        }

        // ── Collect members that need saving in this batch ──
        const membersToSave: typeof activeMembersDue = [];

        for (const member of activeMembersDue) {
            // ── SUBSCRIPTION LOCKDOWN CHECK ──
            if (!hostelSubscriptionCache.has(member.hostelId)) {
                const admin = await User.findOne({ hostelId: member.hostelId, role: "hostel_admin" }).select("subscription").lean() as any;
                let canMutate = false;
                if (admin && admin.subscription) {
                    const state = resolveSubscriptionState(admin.subscription.expiryDate, admin.subscription.status);
                    canMutate = !isReadOnlyMode(state) && !isSubscriptionLocked(state);
                }
                hostelSubscriptionCache.set(member.hostelId, canMutate);
            }
            
            if (!hostelSubscriptionCache.get(member.hostelId)) {
                continue; // Skip mutation for read-only or locked tenants
            }

            let nextDue = new Date(member.due_date);
            let currentBalance = member.balance;
            let deductionsMade = 0;

            // Safe loop: while today is >= due_date
            while (today.getTime() >= nextDue.getTime()) {
                // Absolute Duplicate Protection
                if (member.last_rent_processed_date && member.last_rent_processed_date.getTime() >= nextDue.getTime()) {
                    console.warn(`[CRON SAFETY] Skipped duplicate rent generation for ${member._id} at ${nextDue}`);
                    break;
                }

                currentBalance -= member.rent_amount;
                deductionsMade += 1;
                member.last_rent_processed_date = new Date();
                
                allTransactions.push({
                    hostelId: member.hostelId,
                    memberId: member._id,
                    memberName: member.name,
                    amount: -member.rent_amount,
                    paymentType: "rent",
                    payment_date: new Date(nextDue),
                    createdBy: "SYSTEM_CRON"
                });

                nextDue.setMonth(nextDue.getMonth() + 1);
            }

            if (deductionsMade > 0) {
                member.balance = currentBalance;
                member.due_date = nextDue;
                
                // Defaulter conversion matrix explicitly injected here natively
                if (currentBalance < 0 && member.status === "active") {
                    member.status = "defaulter";
                }
                
                member.last_rent_processed_date = new Date();
                membersToSave.push(member);
                processed++;
            }
        }

        // ── Flush saves in parallel — Promise.allSettled so one failure never aborts others ──
        // Each member is distinct (_id unique). All Mongoose post-save hooks still fire per save.
        for (let i = 0; i < membersToSave.length; i += SAVE_CONCURRENCY) {
            const saveResults = await Promise.allSettled(
                membersToSave.slice(i, i + SAVE_CONCURRENCY).map(m => m.save())
            );
            for (const res of saveResults) {
                if (res.status === "rejected") {
                    console.error(`[hostel-rent-cycle] member.save() failed:`, res.reason?.message ?? res.reason);
                }
            }
        }

        // If we got fewer than BATCH_SIZE, we've processed all
        if (activeMembersDue.length < BATCH_SIZE) {
            hasMore = false;
        }
    }

    if (allTransactions.length > 0) {
        await HostelPaymentLog.insertMany(allTransactions);
    }

    return { processed, transactions: allTransactions.length };
}

export async function GET(req: Request) {
    if (req.headers.get("Authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return withHealthcheck({ checkName: "hostel-rent-cycle", timeoutMs: 55000 }, async () => {
        const jobName = "hostel-rent-cycle";
        const log = await CronLog.create({ jobName, status: "running" });

        try {
            const stats = await executeRentCycle();
            
            log.status = "success";
            log.completedAt = new Date();
            log.metadata = stats;
            await log.save();

            return NextResponse.json({ success: true, ...stats });
        } catch (error: any) {
            console.error(`[CRON ERROR] ${jobName}:`, error);

            // RETRY ONCE
            try {
                console.log(`[CRON RETRY] ${jobName} retrying once...`);
                const retryStats = await executeRentCycle();
                log.status = "success";
                log.metadata = { ...retryStats, retried: true };
                log.completedAt = new Date();
                await log.save();
                return NextResponse.json({ success: true, ...retryStats });
            } catch (retryErr: any) {
                log.status = "failed";
                log.error = error.message || String(error);
                log.completedAt = new Date();
                await log.save();
                return NextResponse.json({ error: "CRON failed globally" }, { status: 500 });
            }
        }
    });
}
