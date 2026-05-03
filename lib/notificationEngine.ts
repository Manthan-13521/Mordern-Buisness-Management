import { dbConnect } from "./mongodb";
import { computeDefaulterStatus } from "./defaulterEngine";

/**
 * ── Step 10: Notification Engine ─────────────────────────────────────────────
 * Server-only automated WhatsApp messaging for:
 * 1. Defaulter reminders (warning + blocked)
 * 2. Due date alerts (1-2 days before nextDueDate)
 * 3. Payment confirmations (called inline after payment)
 */

// M-2 FIX: Use IST date (UTC+5:30) for deduplication key.
// Without this, members could receive 2 notifications per IST calendar day
// because UTC midnight differs from IST midnight by 5.5 hours.
function getTodayKey(): string {
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
    const nowIST = new Date(Date.now() + IST_OFFSET_MS);
    return nowIST.toISOString().slice(0, 10); // YYYY-MM-DD in IST
}

// ── Idempotent guard: skip if already sent today ────────────────────────────
async function alreadySentToday(memberId: any, actionType: string): Promise<boolean> {
    const { NotificationLog } = await import("@/models/NotificationLog");
    const existing = await NotificationLog.findOne({
        memberId,
        actionType,
        dateKey: getTodayKey(),
        status: { $in: ["sent", "failed_permanent"] }
    }).lean();
    return !!existing;
}

// ── Log the notification attempt ────────────────────────────────────────────
async function logNotification(params: {
    memberId: any;
    poolId: string;
    actionType: string;
    message: string;
    status: "sent" | "failed" | "failed_permanent";
    error?: string;
}) {
    const { NotificationLog } = await import("@/models/NotificationLog");
    try {
        await NotificationLog.create({
            memberId: params.memberId,
            poolId: params.poolId,
            module: "pool",
            actionType: params.actionType,
            type: "whatsapp",
            message: params.message,
            status: params.status,
            errorDetails: params.error,
            dateKey: getTodayKey(),
            date: new Date(),
            sentAt: params.status === "sent" ? new Date() : undefined,
        });
    } catch (e: any) {
        // E11000 duplicate key = already sent today, safe to ignore
        if (e?.code !== 11000) {
            console.error("NotificationLog creation failed:", e);
        }
    }
}

// ── Sleep helper for batch safety ───────────────────────────────────────────
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ── Send WhatsApp via Pool's Twilio credentials (circuit-breaker protected) ──
import { createBreaker } from "@/lib/circuitBreaker";

// Singleton breaker — shared across all pools to detect systemic Twilio outages
const twilioBreaker = createBreaker(
    async (client: any, from: string, to: string, body: string) => {
        return client.messages.create({ from, to, body });
    },
    "twilio-whatsapp"
);

async function sendPoolWhatsApp(poolId: string, phone: string, message: string): Promise<{ success: boolean; retryable: boolean; error?: string }> {
    try {
        const { Pool } = await import("@/models/Pool");
        const pool = await Pool.findOne({ poolId }).lean();
        if (!pool?.twilio?.sid || !pool?.twilio?.whatsappNumber) {
            console.warn(`[NotifEngine] Pool ${poolId} has no Twilio config, skipping`);
            return { success: false, retryable: false, error: "No Twilio config" };
        }

        const { getTwilioClient } = await import("@/lib/twilioService");
        const client = getTwilioClient(pool as any);

        const rawPhone = phone.replace(/\D/g, "");
        const toBase = rawPhone.startsWith("91") && rawPhone.length === 12
            ? `+${rawPhone}`
            : `+91${rawPhone}`;
        const to = `whatsapp:${toBase}`;

        // Circuit breaker: fails fast if Twilio is down instead of timing out per-call
        await twilioBreaker.fire(client, pool.twilio.whatsappNumber, to, message);

        return { success: true, retryable: false };
    } catch (e: any) {
        console.error("[NotifEngine] WhatsApp send failed:", e);
        
        let retryable = true;
        
        // Disable retries for client errors and specific Twilio non-retryable codes
        // HTTP 4xx errors
        if (e.status && e.status >= 400 && e.status < 500) {
            retryable = false;
        }
        
        // 21211 (Invalid number), 21614 (Not a valid WhatsApp number), 21610 (Opt-out), 63024 (Consent missing)
        if (e.code === 21211 || e.code === 21614 || e.code === 21610 || e.code === 63024) {
            retryable = false;
        }

        // Circuit breaker tripped — not retryable until breaker resets
        if (e.message?.includes("Tripped Breaker")) {
            retryable = false;
        }
        
        return { success: false, retryable, error: e?.message || "WhatsApp delivery failed" };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. DEFAULTER REMINDERS (warning + blocked, once per day)
// ═══════════════════════════════════════════════════════════════════════════════
export async function processDefaulterReminders(poolId?: string) {
    await dbConnect();
    const { Ledger } = await import("@/models/Ledger");
    const { Subscription } = await import("@/models/Subscription");
    const { Member } = await import("@/models/Member");

    const now = new Date();
    const subQuery: any = { status: "active", nextDueDate: { $lt: now } };
    if (poolId) subQuery.poolId = poolId;

    const overdueSubs = await Subscription.find(subQuery).lean();
    if (overdueSubs.length === 0) return { sent: 0, skipped: 0 };

    const subMap = new Map(overdueSubs.map((s: any) => [s.memberId.toString(), s]));

    const dueLedgers = await Ledger.find({
        ...(poolId ? { poolId } : {}),
        balance: { $gt: 0 },
        memberId: { $in: overdueSubs.map((s: any) => s.memberId) }
    }).lean();

    let sent = 0, skipped = 0;

    // Batch-fetch all relevant members in ONE query (was N+1 before)
    const memberIdsForLookup = dueLedgers
        .filter((l: any) => {
            const sub = subMap.get(l.memberId.toString());
            if (!sub) return false;
            const msDue = now.getTime() - new Date((sub as any).nextDueDate).getTime();
            const overdueDays = Math.floor(msDue / 86400000);
            return computeDefaulterStatus(overdueDays) !== "active";
        })
        .map((l: any) => l.memberId);

    const allMembers = memberIdsForLookup.length > 0
        ? await Member.find({ _id: { $in: memberIdsForLookup } }).select("name phone").lean()
        : [];
    const memberMap = new Map((allMembers as any[]).map(m => [m._id.toString(), m]));

    for (const ledger of dueLedgers as any[]) {
        const sub = subMap.get(ledger.memberId.toString());
        if (!sub) continue;

        const msDue = now.getTime() - new Date((sub as any).nextDueDate).getTime();
        const overdueDays = Math.floor(msDue / 86400000);
        const status = computeDefaulterStatus(overdueDays);

        // Only send to warning (5-15d) and blocked (>15d)
        if (status === "active") { skipped++; continue; }

        // Idempotent check
        if (await alreadySentToday(ledger.memberId, "defaulter_reminder")) { skipped++; continue; }

        const member = memberMap.get(ledger.memberId.toString());
        if (!member?.phone) { skipped++; continue; }

        const message = status === "blocked"
            ? `Hi ${(member as any).name}, your pending amount is ₹${ledger.balance.toLocaleString("en-IN")}. Please clear it to avoid service interruption.`
            : `Reminder: ₹${ledger.balance.toLocaleString("en-IN")} is pending for ${(member as any).name}. Kindly pay soon to avoid restrictions.`;

        const { success, retryable, error } = await sendPoolWhatsApp(ledger.poolId, (member as any).phone, message);

        if (!success) {
            // Log as failed_permanent if not retryable, otherwise failed
            await logNotification({
                memberId: ledger.memberId,
                poolId: ledger.poolId,
                actionType: "defaulter_reminder",
                message,
                status: retryable ? "failed" : "failed_permanent",
                error
            });
            skipped++;
        } else {
            await logNotification({
                memberId: ledger.memberId,
                poolId: ledger.poolId,
                actionType: "defaulter_reminder",
                message,
                status: "sent"
            });
            sent++;
        }
        
        await sleep(300); // Guarantees order + avoids burst
    }

    return { sent, skipped };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. DUE DATE ALERTS (1-2 days before nextDueDate, once per cycle)
// ═══════════════════════════════════════════════════════════════════════════════
export async function processDueAlerts(poolId?: string) {
    await dbConnect();
    const { Subscription } = await import("@/models/Subscription");
    const { Member } = await import("@/models/Member");
    const { Plan } = await import("@/models/Plan");

    const now = new Date();
    const twoDaysFromNow = new Date(now.getTime() + 2 * 86400000);

    const subQuery: any = {
        status: "active",
        nextDueDate: { $gte: now, $lte: twoDaysFromNow }
    };
    if (poolId) subQuery.poolId = poolId;

    const upcomingSubs = await Subscription.find(subQuery).lean();
    if (upcomingSubs.length === 0) return { sent: 0, skipped: 0 };

    let sent = 0, skipped = 0;

    for (const sub of upcomingSubs as any[]) {
        if (await alreadySentToday(sub.memberId, "due_alert")) { skipped++; continue; }

        const member = await Member.findById(sub.memberId).select("name phone").lean();
        if (!member?.phone) { skipped++; continue; }

        const plan = await Plan.findById(sub.planId).select("name price").lean();
        const daysUntil = Math.ceil((new Date(sub.nextDueDate).getTime() - now.getTime()) / 86400000);
        const dayText = daysUntil <= 0 ? "today" : daysUntil === 1 ? "tomorrow" : `in ${daysUntil} days`;

        const message = `Hi ${(member as any).name}, your payment of ₹${((plan as any)?.price || 0).toLocaleString("en-IN")} for ${(plan as any)?.name || "your plan"} is due ${dayText}. Please pay on time to continue services.`;

        const { success, retryable, error } = await sendPoolWhatsApp(sub.poolId, (member as any).phone, message);

        if (!success) {
            await logNotification({
                memberId: sub.memberId,
                poolId: sub.poolId,
                actionType: "due_alert",
                message,
                status: retryable ? "failed" : "failed_permanent",
                error
            });
            skipped++;
        } else {
            await logNotification({
                memberId: sub.memberId,
                poolId: sub.poolId,
                actionType: "due_alert",
                message,
                status: "sent"
            });
            sent++;
        }
        
        await sleep(300); // Guarantees order + avoids burst
    }

    return { sent, skipped };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. PAYMENT CONFIRMATION (instant, called inline after payment)
// ═══════════════════════════════════════════════════════════════════════════════
export async function sendPaymentConfirmation(params: {
    memberId: any;
    poolId: string;
    memberName: string;
    phone: string;
    amount: number;
}) {
    // Dedup check — only 1 confirmation per member per day (handles retries)
    if (await alreadySentToday(params.memberId, "payment_confirmation")) return false;

    const message = `Payment of ₹${params.amount.toLocaleString("en-IN")} received successfully for ${params.memberName}. Thank you!`;

    const { success, retryable, error } = await sendPoolWhatsApp(params.poolId, params.phone, message);

    await logNotification({
        memberId: params.memberId,
        poolId: params.poolId,
        actionType: "payment_confirmation",
        message,
        status: success ? "sent" : (retryable ? "failed" : "failed_permanent"),
        error
    });

    return success;
}
