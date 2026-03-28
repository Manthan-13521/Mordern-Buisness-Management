import { dbConnect } from "@/lib/mongodb";
import { Pool } from "@/models/Pool";
import { Plan } from "@/models/Plan";
import { Member } from "@/models/Member";
import { MessageLog } from "@/models/MessageLog";
import { sendWhatsAppForPool } from "@/lib/twilioService";
import { logger } from "@/lib/logger";

// ── Dedup helper ─────────────────────────────────────────────────────────────
// Returns true if a message of this type was already sent today for this member
async function alreadySentToday(
    memberId: string,
    type: "before_expiry" | "after_expiry"
): Promise<boolean> {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);

    const existing = await MessageLog.findOne({
        memberId,
        type,
        status: "sent",
        createdAt: { $gte: dayStart },
    }).lean();

    return !!existing;
}

// ── Main cron function ───────────────────────────────────────────────────────

export interface ExpiryAlertResult {
    poolsProcessed: number;
    poolsSkipped: number;
    membersChecked: number;
    beforeSent: number;
    afterSent: number;
    failed: number;
}

export async function runExpiryAlerts(): Promise<ExpiryAlertResult> {
    await dbConnect();

    const result: ExpiryAlertResult = {
        poolsProcessed: 0,
        poolsSkipped: 0,
        membersChecked: 0,
        beforeSent: 0,
        afterSent: 0,
        failed: 0,
    };

    // ── Date boundaries ──────────────────────────────────────────────────
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const twoDaysFromNow = new Date(today);
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);

    const twoDaysFromNowEnd = new Date(twoDaysFromNow);
    twoDaysFromNowEnd.setHours(23, 59, 59, 999);

    // ── Get all pools with Twilio connected ──────────────────────────────
    const pools = await Pool.find({ isTwilioConnected: true, status: "ACTIVE" }).lean();

    logger.info("[ExpiryAlerts] Starting run", { poolCount: pools.length });

    for (const pool of pools) {
        try {
            result.poolsProcessed++;

            // Get all active members for this pool whose plan has WhatsApp alerts on
            // We'll fetch plans per-pool then filter members
            const alertPlans = await Plan.find({
                poolId: pool.poolId,
                isActive: true,
                deletedAt: null,
                $or: [{ enableWhatsAppAlerts: true }, { whatsAppAlert: true }],
            }).lean();

            if (alertPlans.length === 0) continue;

            const alertPlanIds = alertPlans.map(p => p._id);
            const planMap = new Map(alertPlans.map(p => [p._id.toString(), p]));

            // Members whose expiry is exactly 2 days away OR already expired (status not yet = expired)
            const members = await Member.find({
                poolId: pool.poolId,
                planId: { $in: alertPlanIds },
                isDeleted: false,
                $or: [
                    // Before expiry: expires in 2 days window
                    { expiryDate: { $gte: twoDaysFromNow, $lte: twoDaysFromNowEnd } },
                    // After expiry: past today and not yet marked expired
                    { expiryDate: { $lt: today }, status: { $ne: "expired" }, isExpired: false },
                ],
            })
                .select("_id name phone expiryDate status isExpired planId poolId")
                .lean();

            result.membersChecked += members.length;

            for (const member of members) {
                try {
                    const plan = planMap.get(member.planId.toString());
                    if (!plan) continue;

                    const expiryDate = member.expiryDate ? new Date(member.expiryDate) : null;
                    if (!expiryDate) continue;

                    // ── BEFORE EXPIRY (2 days) ───────────────────────────────────
                    if (expiryDate >= twoDaysFromNow && expiryDate <= twoDaysFromNowEnd) {
                        const alreadySent = await alreadySentToday(member._id.toString(), "before_expiry");
                        if (!alreadySent) {
                            const text = plan.messages?.beforeExpiry?.text ||
                                `⏳ Hello ${member.name}, your membership expires in 2 days. Please renew to continue enjoying the pool!`;
                            const mediaUrl = plan.messages?.beforeExpiry?.mediaUrl ?? null;

                            const sent = await sendWhatsAppForPool(
                                pool as any,
                                { _id: member._id, phone: member.phone, name: member.name },
                                { text, mediaUrl },
                                "before_expiry"
                            );
                            sent ? result.beforeSent++ : result.failed++;
                        }
                    }

                    // ── AFTER EXPIRY ─────────────────────────────────────────────
                    if (expiryDate < today && !member.isExpired && member.status !== "expired") {
                        // Mark member as expired first
                        await Member.findByIdAndUpdate(member._id, {
                            $set: {
                                isExpired: true,
                                expiredAt: now,
                                status: "expired",
                                isActive: false,
                            },
                        });

                        const alreadySent = await alreadySentToday(member._id.toString(), "after_expiry");
                        if (!alreadySent) {
                            const text = plan.messages?.afterExpiry?.text ||
                                `❌ Hello ${member.name}, your membership has expired. Please renew to regain access to the pool!`;
                            const mediaUrl = plan.messages?.afterExpiry?.mediaUrl ?? null;

                            const sent = await sendWhatsAppForPool(
                                pool as any,
                                { _id: member._id, phone: member.phone, name: member.name },
                                { text, mediaUrl },
                                "after_expiry"
                            );
                            sent ? result.afterSent++ : result.failed++;
                        }
                    }
                } catch (memberErr: any) {
                    // ── Fail-safe: never crash the loop for one member ───────────
                    result.failed++;
                    logger.error("[ExpiryAlerts] Member processing failed", {
                        memberId: member._id,
                        poolId: pool.poolId,
                        error: memberErr?.message || String(memberErr),
                    });
                }
            }
        } catch (poolErr: any) {
            result.poolsSkipped++;
            logger.error("[ExpiryAlerts] Pool processing failed", {
                poolId: pool.poolId,
                error: poolErr?.message || String(poolErr),
            });
        }
    }

    logger.info("[ExpiryAlerts] Run complete", result);
    return result;
}
