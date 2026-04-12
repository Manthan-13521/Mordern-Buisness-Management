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

        // Map Target to Exactly 2 Days From Now
        const targetDate = new Date(today.getTime() + 2 * 86400000);
        const endOfTargetDate = new Date(targetDate.getTime() + 86400000 - 1);

        // Fetch targets due in exactly 2 days where lastReminderSentAt != today
        const targets = await HostelMember.find({
            status: "active",
            isDeleted: false,
            due_date: { $gte: targetDate, $lte: endOfTargetDate },
            $or: [
                { lastReminderSentAt: { $lt: today } },
                { lastReminderSentAt: { $exists: false } }
            ]
        }).lean() as any[];

        let sentCount = 0;
        let failedCount = 0;

        for (const member of targets) {
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

                // Explicit Message Dispatch
                const message = `Your hostel rent is due in 2 days. Please pay your balance to avoid defaulter status.`;
                
                // Generic twilio invocation structure mapping to the repository pattern
                const { Twilio } = await import("twilio");
                const client = new Twilio(hostel.twilio.sid, hostel.twilio.authToken);
                
                const toPhone = member.phone.startsWith("whatsapp:") ? member.phone : `whatsapp:+91${member.phone.replace(/\D/g, '').slice(-10)}`;
                const fromPhone = hostel.twilio.whatsappNumber;

                // Send and mark as sent natively immediately
                await client.messages.create({ body: message, from: fromPhone, to: toPhone });
                
                await HostelMember.updateOne(
                    { _id: member._id },
                    { $set: { lastReminderSentAt: new Date() } }
                );

                sentCount++;
            } catch (e) {
                console.warn(`[WHATSAPP-CRON] Failed to send reminder to Member ${member._id}`, e);
                failedCount++;
            }
        }

        log.status = "success";
        log.completedAt = new Date();
        log.metadata = { sentCount, failedCount, targetsEvaluated: targets.length };
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
