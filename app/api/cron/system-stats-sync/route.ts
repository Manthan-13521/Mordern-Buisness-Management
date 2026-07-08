import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { SystemStats } from "@/models/SystemStats";
import { Member } from "@/models/Member";
import { HostelMember } from "@/models/HostelMember";
import { BusinessCustomer } from "@/models/BusinessCustomer";
import { UnifiedUser } from "@/models/UnifiedUser"; // Proxy for active users or just count them

import { withHealthcheck } from "@/lib/healthchecks";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    // Authenticate cron if needed (Vercel Cron uses CRON_SECRET)
    const authHeader = req.headers.get("authorization");
    if (
        process.env.CRON_SECRET &&
        authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
        return new Response("Unauthorized", { status: 401 });
    }

    return withHealthcheck({ checkName: "system-stats-sync", timeoutMs: 25000 }, async () => {
        try {
            await dbConnect();

            const now = new Date();
            const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

            // Run all three counts in parallel — independent queries on separate collections
            const [poolUsers, hostelUsers, businessUsers] = await Promise.all([
                Member.countDocuments({}),
                HostelMember.countDocuments({}),
                BusinessCustomer.countDocuments({}),
            ]);

            // Global active metric: sum across all modules
            const activeUsersCount = poolUsers + hostelUsers + businessUsers;

            await SystemStats.findOneAndUpdate(
                { month: monthKey },
                {
                    $set: {
                        poolUsers,
                        hostelUsers,
                        businessUsers,
                        activeUsers: activeUsersCount
                    }
                },
                { upsert: true, new: true }
            );

            return NextResponse.json({ success: true, month: monthKey });
        } catch (e: any) {
            return NextResponse.json({ error: e.message }, { status: 500 });
        }
    });
}
