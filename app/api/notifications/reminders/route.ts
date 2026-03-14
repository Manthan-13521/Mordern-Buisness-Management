import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { Member } from "@/models/Member";
import { Plan } from "@/models/Plan";
import { NotificationLog } from "@/models/NotificationLog";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
    const authHeader = req.headers.get("authorization");

    // Allow Cron Jobs with Secret OR Authenticated Admins
    let isAuthorized = false;
    if (authHeader === `Bearer ${process.env.CRON_SECRET || "cron123"}`) {
        isAuthorized = true;
    } else {
        // Check session
        const session = await getServerSession(authOptions);
        if (session?.user && session.user.role === "admin") {
            isAuthorized = true;
        }
    }

    if (!isAuthorized) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        await connectDB();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const inTwoDays = new Date(today);
        inTwoDays.setDate(inTwoDays.getDate() + 2);

        const inThreeDays = new Date(today);
        inThreeDays.setDate(inThreeDays.getDate() + 3);

        const membersExpiring = await Member.find({
            $or: [
                { status: "active", expiryDate: { $gte: inTwoDays, $lt: inThreeDays } }, // Expiring in 2 days
                { expiryDate: { $gte: yesterday, $lt: today } } // Expired yesterday
            ]
        }).populate("planId");

        let sentCount = 0;
        const logs = [];

        for (const member of membersExpiring) {
            const plan = member.planId as any;
            if (!plan?.whatsAppAlert) continue; // Only process if whatsAppAlert is true

            const isHourly = !!plan?.durationHours;
            const durationDays = plan?.durationDays || 0;

            // Only send expiry alert if the plan exceeds 7 days (or is exactly 7 days, excluding shorter/hourly plans)
            if (!isHourly && durationDays >= 7) {
                const isExpiringSoon = member.expiryDate >= inTwoDays && member.expiryDate < inThreeDays;
                
                let message = "";
                if (isExpiringSoon) {
                    message = `Hello ${member.name}, your swimming pool membership (ID: ${member.memberId}) is expiring in 2 days on ${new Date(member.expiryDate).toLocaleDateString()}. Please renew it to continue enjoying the pool! \n- TS Pools Mgmt`;
                } else {
                    message = `Hello ${member.name}, your swimming pool membership (ID: ${member.memberId}) has expired. Please renew it to continue enjoying the pool! \n- TS Pools Mgmt`;
                }

                const success = await sendWhatsAppMessage(member.phone, message);

                const log = new NotificationLog({
                    memberId: member._id,
                    type: "whatsapp",
                    message,
                    status: success ? "sent" : "failed",
                });

                logs.push(log);
                if (success) sentCount++;
            }
        }

        if (logs.length > 0) {
            await NotificationLog.insertMany(logs);
        }

        return NextResponse.json({
            message: "Reminders processed",
            totalFound: membersExpiring.length,
            sentSuccessfully: sentCount,
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to process reminders" }, { status: 500 });
    }
}
