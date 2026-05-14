import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { SystemStats } from "@/models/SystemStats";
import { Member } from "@/models/Member";
import { HostelMember } from "@/models/HostelMember";
import { BusinessCustomer } from "@/models/BusinessCustomer";
import { UnifiedUser } from "@/models/UnifiedUser";
import { ReferralUsage } from "@/models/ReferralUsage";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    try {
        // Authenticate cron if needed (Vercel Cron uses CRON_SECRET)
        const authHeader = req.headers.get("authorization");
        if (
            process.env.CRON_SECRET &&
            authHeader !== `Bearer ${process.env.CRON_SECRET}`
        ) {
            return new Response("Unauthorized", { status: 401 });
        }

        await dbConnect();

        const now = new Date();
        const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

        // Get total pool members
        const poolUsers = await Member.countDocuments({});

        // Get total hostel members
        const hostelUsers = await HostelMember.countDocuments({});

        // Get total business customers
        const businessUsers = await BusinessCustomer.countDocuments({});

        // Get total referral uses
        const referralUses = await ReferralUsage.countDocuments({});

        // For activeUsers across the system
        const activeUsersCount = poolUsers + hostelUsers + businessUsers;

        await SystemStats.findOneAndUpdate(
            { month: monthKey },
            {
                $set: {
                    poolUsers,
                    hostelUsers,
                    businessUsers,
                    activeUsers: activeUsersCount,
                    referralUses
                }
            },
            { upsert: true, new: true }
        );

        return NextResponse.json({ success: true, month: monthKey });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
