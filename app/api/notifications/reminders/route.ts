import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { Member } from "@/models/Member";
import { Plan } from "@/models/Plan";
import { NotificationLog } from "@/models/NotificationLog";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
    const authHeader = req.headers.get("authorization");

    // Allow Cron Jobs with Secret OR Authenticated Admins
    let isAuthorized = false;
    let session: Session | null = null;
    if (authHeader === `Bearer ${process.env.CRON_SECRET}`) {
        isAuthorized = true;
    } else {
        await dbConnect();
        session = await getServerSession(authOptions);
        if (session?.user && session.user.role === "admin") {
            isAuthorized = true;
        }
    }

    if (!isAuthorized) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        await dbConnect();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const inTwoDays = new Date(today);
        inTwoDays.setDate(inTwoDays.getDate() + 2);

        const inThreeDays = new Date(today);
        inThreeDays.setDate(inThreeDays.getDate() + 3);

        const inSevenDays = new Date(today);
        inSevenDays.setDate(inSevenDays.getDate() + 7);

        const inEightDays = new Date(today);
        inEightDays.setDate(inEightDays.getDate() + 8);

        // Pool isolation — superadmin or cron sees all, admin sees only their pool
        const poolFilter: Record<string, unknown> = {};
        if (session?.user?.role === "admin" && session.user.poolId) {
            poolFilter.poolId = session.user.poolId;
        }

        const membersExpiring = await Member.find({
            ...poolFilter,
            $or: [
                { status: "active", expiryDate: { $gte: inSevenDays, $lt: inEightDays } }, // Expiring in 7 days
                { status: "active", expiryDate: { $gte: inTwoDays,  $lt: inThreeDays } }, // Expiring in 2 days
                { expiryDate: { $gte: yesterday, $lt: today } } // Expired yesterday
            ]
        }).populate("planId", "whatsAppAlert durationDays durationHours")
          .select("name phone memberId expiryDate planId")
          .lean();


        let sentCount = 0;
        const logs = [];

        for (const member of membersExpiring) {
            const plan = member.planId as any;
            if (!plan?.whatsAppAlert) continue; // Only process if whatsAppAlert is true

            const isHourly = !!plan?.durationHours;
            const durationDays = plan?.durationDays || 0;

            // Only send expiry alert if the plan exceeds 7 days (or is exactly 7 days, excluding shorter/hourly plans)
            if (!isHourly && durationDays >= 7) {
                const expiryDate = member.expiryDate ?? new Date();
                const isExpiringSoon7 = expiryDate >= inSevenDays && expiryDate < inEightDays;
                const isExpiringSoon2 = expiryDate >= inTwoDays  && expiryDate < inThreeDays;
                const expiryDateStr   = new Date(expiryDate).toLocaleDateString();

                let message = "";
                if (isExpiringSoon7) {
                    message = `Hello ${member.name}, your swimming pool membership (ID: ${member.memberId}) is expiring in 7 days on ${expiryDateStr}. Please renew it to continue enjoying the pool!\n- TS Pools Mgmt`;
                } else if (isExpiringSoon2) {
                    message = `Hello ${member.name}, your swimming pool membership (ID: ${member.memberId}) is expiring in 2 days on ${expiryDateStr}. Please renew it to continue enjoying the pool!\n- TS Pools Mgmt`;
                } else {
                    message = `Hello ${member.name}, your swimming pool membership (ID: ${member.memberId}) has expired. Please renew it to continue enjoying the pool!\n- TS Pools Mgmt`;
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
