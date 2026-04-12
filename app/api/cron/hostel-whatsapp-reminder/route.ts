import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { HostelMember } from "@/models/HostelMember";
import { Hostel } from "@/models/Hostel";
import { HostelPlan } from "@/models/HostelPlan";
import { CronLog } from "@/models/CronLog";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    if (req.headers.get("Authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

        for (const member of allTasks) {
            try {
                // Determine messaging channels if active on plan or globally
                const plan = await HostelPlan.findById(member.planId).lean() as any;
                if (!plan || (!plan.enableWhatsAppAlerts && !plan.whatsAppAlert)) {
                    continue; 
                }

                const hostel = await Hostel.findOne({ hostelId: member.hostelId }).lean() as any;
                if (!hostel || !hostel.twilio?.whatsappNumber) {
                    continue; 
                }

                // Explicit Message Dispatch Based on Type
                const isOverdue = member._reminderType === 'overdue';
                const message = isOverdue 
                    ? `Your hostel rent is overdue. Please pay your outstanding balance immediately to avoid further action.`
                    : `Your hostel rent is due in 2 days. Please pay your balance to avoid defaulter status.`;
                
                // Generic twilio invocation structure mapping to the repository pattern
                const { Twilio } = await import("twilio");
                const client = new Twilio(hostel.twilio.sid, hostel.twilio.authToken);
                
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
}
