import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { User } from "@/models/User";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { logger } from "@/lib/logger";
import { requireCronAuth } from "@/lib/requireCronAuth";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/subscription-expiry
 * Triggered daily to:
 * 1. Mark expired users as "expired"
 * 2. Send WhatsApp alerts at 3 days, 1 day, and on expiry.
 */
export async function GET(req: Request) {
    const authError = requireCronAuth(req);
    if (authError) return authError;

    try {
        await dbConnect();

        const now = new Date();
        const todayStr = now.toLocaleDateString("en-GB");

        // 1. Mark Expired Users
        // Any active user whose expiryDate has passed
        const expiredResult = await User.updateMany(
            {
                "subscription.status": "active",
                "subscription.expiryDate": { $lt: now },
            },
            {
                $set: { "subscription.status": "expired" },
            }
        );

        // 2. Identify Users for Alerts
        // Ranges for 3 days and 1 day
        const threeDaysFromNow = new Date(now);
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
        const threeDaysEnd = new Date(threeDaysFromNow);
        threeDaysEnd.setHours(23, 59, 59, 999);

        const oneDayFromNow = new Date(now);
        oneDayFromNow.setDate(oneDayFromNow.getDate() + 1);
        const oneDayEnd = new Date(oneDayFromNow);
        oneDayEnd.setHours(23, 59, 59, 999);

        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(now);
        todayEnd.setHours(23, 59, 59, 999);

        const usersToAlert = await User.find({
            role: { $ne: "superadmin" },
            "subscription.expiryDate": { $exists: true },
            $or: [
                { "subscription.expiryDate": { $gte: threeDaysFromNow, $lte: threeDaysEnd } },
                { "subscription.expiryDate": { $gte: oneDayFromNow, $lte: oneDayEnd } },
                { "subscription.expiryDate": { $gte: todayStart, $lte: todayEnd } },
            ],
        }).select("name email phone subscription");

        let alertsSent = 0;
        for (const user of usersToAlert) {
            if (!user.phone) continue;

            const expiryDate = new Date(user.subscription!.expiryDate);
            const expiryStr = expiryDate.toLocaleDateString("en-GB");
            
            const message = `Your AquaSync subscription expires on ${expiryStr}. Renew now to avoid service interruption.`;
            
            const success = await sendWhatsAppMessage(user.phone, message);
            if (success) alertsSent++;
        }

        logger.info("[Cron] Subscription Expiry Cleanup", {
            markedExpired: expiredResult.modifiedCount,
            alertsSent,
        });

        return NextResponse.json({
            success: true,
            markedExpired: expiredResult.modifiedCount,
            alertsSent,
        });
    } catch (error: any) {
        logger.error("[Cron] Subscription Expiry Error", { error: error?.message });
        return NextResponse.json({ error: "Cron failed", detail: error?.message }, { status: 500 });
    }
}

/**
 * Support POST for manual triggering via tools/scripts
 */
export async function POST(req: Request) {
    return GET(req);
}
