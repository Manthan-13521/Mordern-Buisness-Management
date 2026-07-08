import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { HostelMember } from "@/models/HostelMember";
import { Hostel } from "@/models/Hostel";
import { HostelPlan } from "@/models/HostelPlan";
import { CronLog } from "@/models/CronLog";
import { decryptToken } from "@/lib/twilioService";
import { withHealthcheck } from "@/lib/healthchecks";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    if (req.headers.get("Authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return withHealthcheck({ checkName: "hostel-whatsapp-reminder", timeoutMs: 55000 }, async () => {
    const jobName = "hostel-whatsapp-reminder";
    const log = await CronLog.create({ jobName, status: "running" });

    try {
        await dbConnect();
        
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        // 1. Upcoming Reminders (exactly 2 days before due date)
        const upcomingTargetDate = new Date(today.getTime() + 2 * 86400000);
        const endOfUpcomingTargetDate = new Date(upcomingTargetDate.getTime() + 86400000 - 1);

        const upcomingTargets = await HostelMember.find({
            status: "active",
            isDeleted: false,
            due_date: { $gte: upcomingTargetDate, $lte: endOfUpcomingTargetDate },
            $or: [
                { lastReminderSentAt: { $lt: today } },
                { lastReminderSentAt: { $exists: false } }
            ]
        }).lean() as any[];

        // 2. Overdue Reminders (exactly 1 day AFTER due date, meaning their due date is exactly 1 day ago)
        // today - due_date == 1 -> due_date is yesterday. AND balance < 0
        const overdueTargetDate = new Date(today.getTime() - 1 * 86400000);
        const endOfOverdueTargetDate = new Date(overdueTargetDate.getTime() + 86400000 - 1);

        const overdueTargets = await HostelMember.find({
            status: { $in: ["active", "defaulter"] },
            isDeleted: false,
            balance: { $lt: 0 },
            due_date: { $gte: overdueTargetDate, $lte: endOfOverdueTargetDate },
            $or: [
                { lastOverdueReminderSentAt: { $lt: today } },
                { lastOverdueReminderSentAt: { $exists: false } }
            ]
        }).lean() as any[];

        const allTasks = [
            ...upcomingTargets.map(t => ({ ...t, _reminderType: 'upcoming' })),
            ...overdueTargets.map(t => ({ ...t, _reminderType: 'overdue' }))
        ];

        let sentCount = 0;
        let failedCount = 0;

        if (allTasks.length === 0) {
            log.status = "success";
            log.completedAt = new Date();
            log.metadata = { sentCount: 0, failedCount: 0, targetsEvaluated: 0 };
            await log.save();
            return NextResponse.json({ success: true, sentCount: 0, failedCount: 0 });
        }

        // ── Batch pre-fetch plans and hostels (eliminates N+1 + N Twilio re-inits) ──
        const uniquePlanIds   = [...new Set(allTasks.map(t => t.planId?.toString()).filter(Boolean))];
        const uniqueHostelIds = [...new Set(allTasks.map(t => t.hostelId).filter(Boolean))];

        const [plansArr, hostelsArr] = await Promise.all([
            HostelPlan.find({ _id: { $in: uniquePlanIds } }).lean(),
            Hostel.find({ hostelId: { $in: uniqueHostelIds } }).lean(),
        ]);

        const planMap   = new Map((plansArr  as any[]).map(p => [p._id.toString(), p]));
        const hostelMap = new Map((hostelsArr as any[]).map(h => [h.hostelId, h]));

        // One Twilio client per hostel — avoid re-instantiating SDK per message
        const twilioClientCache = new Map<string, any>();

        for (const member of allTasks) {
            try {
                // O(1) lookups from pre-fetched Maps
                const plan = planMap.get(member.planId?.toString()) as any;
                if (!plan || (!plan.enableWhatsAppAlerts && !plan.whatsAppAlert)) {
                    continue; 
                }

                const hostel = hostelMap.get(member.hostelId) as any;
                if (!hostel || !hostel.twilio?.whatsappNumber) {
                    continue; 
                }

                // Free Trial Guard
                if (hostel.subscriptionStatus === "trial") {
                    continue;
                }

                // Explicit Message Dispatch Based on Type
                const isOverdue = member._reminderType === 'overdue';
                const message = isOverdue 
                    ? `Your hostel rent is overdue. Please pay your outstanding balance immediately to avoid further action.`
                    : `Your hostel rent is due in 2 days. Please pay your balance to avoid defaulter status.`;
                
                // Reuse cached Twilio client — decrypt auth token once per hostel per run
                if (!twilioClientCache.has(member.hostelId)) {
                    // Guard: skip hostel if encryption fields are missing
                    if (!hostel.twilio?.authToken_encrypted || !hostel.twilio?.iv) {
                        console.warn(`[WHATSAPP-CRON] Hostel ${member.hostelId} missing Twilio credentials, skipping`);
                        continue;
                    }
                    const authToken = decryptToken(hostel.twilio.authToken_encrypted, hostel.twilio.iv);
                    const { Twilio } = await import("twilio");
                    twilioClientCache.set(member.hostelId, new Twilio(hostel.twilio.sid, authToken));
                }
                const client = twilioClientCache.get(member.hostelId);
                
                const toPhone = member.phone.startsWith("whatsapp:") ? member.phone : `whatsapp:+91${member.phone.replace(/\D/g, '').slice(-10)}`;
                const fromPhone = hostel.twilio.whatsappNumber;

                // Send and mark as sent natively immediately
                await client.messages.create({ body: message, from: fromPhone, to: toPhone });
                
                if (isOverdue) {
                    await HostelMember.updateOne(
                        { _id: member._id },
                        { $set: { lastOverdueReminderSentAt: new Date() } }
                    );
                } else {
                    await HostelMember.updateOne(
                        { _id: member._id },
                        { $set: { lastReminderSentAt: new Date() } }
                    );
                }

                sentCount++;
            } catch (e) {
                console.warn(`[WHATSAPP-CRON] Failed to send reminder to Member ${member._id}`, e);
                failedCount++;
            }
        }

        log.status = "success";
        log.completedAt = new Date();
        log.metadata = { sentCount, failedCount, targetsEvaluated: allTasks.length };
        await log.save();

        return NextResponse.json({ success: true, sentCount, failedCount });

    } catch (error: any) {
        log.status = "failed";
        log.error = error.message || String(error);
        log.completedAt = new Date();
        await log.save();

        console.error(`[CRON ERROR] ${jobName}:`, error);
        return NextResponse.json({ error: "Failed global whatsapp dispatch" }, { status: 500 });
    }
    }); // end withHealthcheck
}
