import { dbConnect } from "@/lib/mongodb";
import { Member } from "@/models/Member";
import { HostelMember } from "@/models/HostelMember";
import { NotificationLog } from "@/models/NotificationLog";
import { Pool } from "@/models/Pool";
import { Hostel } from "@/models/Hostel";
import { decryptToken } from "@/lib/twilioService";
import twilio from "twilio";
import { logger } from "@/lib/logger";

const ALERT_MESSAGE = "Your plan expired yesterday. Please renew immediately to continue access.";

export async function runNextDayExpiryAlerts() {
    await dbConnect();
    
    // 1. Calculate "Yesterday" in IST
    const now = new Date();
    const IST_OFFSET = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + IST_OFFSET);
    
    // Start of yesterday (in UTC representing IST Midnight)
    const yesterdayStartIST = new Date(Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate() - 1));
    yesterdayStartIST.setTime(yesterdayStartIST.getTime() - IST_OFFSET);
    
    // End of yesterday
    const yesterdayEndIST = new Date(yesterdayStartIST.getTime() + 24 * 60 * 60 * 1000 - 1);

    logger.info("[NextDayAlerts] Running for yesterday range (IST):", { yesterdayStartIST, yesterdayEndIST });

    let totalSent = 0;
    let totalFailed = 0;

    // --- PROCESS POOL MEMBERS ---
    const pools = await Pool.find({ isTwilioConnected: true, status: "ACTIVE" }).lean();
    for (const pool of pools) {
        if (!pool.twilio?.sid || !pool.twilio?.authToken_encrypted || !pool.twilio?.iv) continue;
        
        let client;
        try {
            const authToken = decryptToken(pool.twilio.authToken_encrypted, pool.twilio.iv);
            client = twilio(pool.twilio.sid, authToken);
        } catch (e) {
            continue;
        }

        const eligiblePoolMembers = await Member.find({
            poolId: pool.poolId,
            isActive: true,
            isDeleted: false,
            expiryAlertNextDaySent: { $ne: true },
            expiryDate: { $gte: yesterdayStartIST, $lte: yesterdayEndIST }
        });

        for (const member of eligiblePoolMembers) {
            const { success, errorMsg } = await sendWithRetry(client, pool.twilio.whatsappNumber, member.phone, ALERT_MESSAGE);
            
            // ALWAYS CREATE NOTIFICATION LOG
            await NotificationLog.create({
                memberId: member._id,
                poolId: pool.poolId,
                module: "pool",
                actionType: "expiry_next_day",
                type: "whatsapp",
                message: ALERT_MESSAGE,
                status: success ? "sent" : "failed",
                errorDetails: errorMsg,
            });

            if (success) {
                totalSent++;
                member.expiryAlertNextDaySent = true;
                await member.save();
            } else {
                totalFailed++;
            }
        }
    }

    // --- PROCESS HOSTEL MEMBERS ---
    const hostels = await Hostel.find({ isTwilioConnected: true, status: "ACTIVE" }).lean();
    for (const hostel of hostels) {
        if (!hostel.twilio?.sid || !hostel.twilio?.authToken_encrypted || !hostel.twilio?.iv) continue;
        
        let client;
        try {
            const authToken = decryptToken(hostel.twilio.authToken_encrypted, hostel.twilio.iv);
            client = twilio(hostel.twilio.sid, authToken);
        } catch (e) {
            continue;
        }

        const eligibleHostelMembers = await HostelMember.find({
            hostelId: hostel.hostelId,
            status: "active",
            isDeleted: false,
            expiryAlertNextDaySent: { $ne: true },
            due_date: { $gte: yesterdayStartIST, $lte: yesterdayEndIST }
        });

        for (const member of eligibleHostelMembers) {
            const { success, errorMsg } = await sendWithRetry(client, hostel.twilio.whatsappNumber, member.phone, ALERT_MESSAGE);
            
            await NotificationLog.create({
                memberId: member._id,
                poolId: hostel.hostelId, // Using poolId field to store tenantId for shared table
                module: "hostel",
                actionType: "expiry_next_day",
                type: "whatsapp",
                message: ALERT_MESSAGE,
                status: success ? "sent" : "failed",
                errorDetails: errorMsg,
            });

            if (success) {
                totalSent++;
                member.expiryAlertNextDaySent = true;
                await member.save();
            } else {
                totalFailed++;
            }
        }
    }

    return { success: true, totalSent, totalFailed };
}

// Format number and send. Includes exactly 1 retry inside.
async function sendWithRetry(client: any, fromNumber: string, phone: string, text: string) {
    const rawPhone = phone.replace(/\D/g, "");
    const toBase = rawPhone.startsWith("91") && rawPhone.length === 12 ? `+${rawPhone}` : `+91${rawPhone}`;
    const to = `whatsapp:${toBase}`;

    let attempts = 0;
    while (attempts < 2) {
        attempts++;
        try {
            await client.messages.create({
                from: fromNumber,
                to,
                body: text
            });
            return { success: true };
        } catch (err: any) {
            if (attempts === 2) {
                return { success: false, errorMsg: err?.message || String(err) };
            }
            // Add a small delay on retry
            await new Promise(r => setTimeout(r, 500));
        }
    }
    return { success: false, errorMsg: "Unknown error" };
}
