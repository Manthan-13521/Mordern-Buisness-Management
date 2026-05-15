import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { SystemStats } from "@/models/SystemStats";
import { Member } from "@/models/Member";
import { HostelMember } from "@/models/HostelMember";
import { BusinessCustomer } from "@/models/BusinessCustomer";
import { UnifiedUser } from "@/models/UnifiedUser"; // Proxy for active users or just count them

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

        // For activeUsers across the system, assuming total unique users 
        // who have accessed or are 'active' (not deleted, etc)
        // Here we just use a metric based on unified users or just total combined.
        // If there's an isActive flag we'd use it. For now, estimate active as sum of systems if we don't have a single "active" flag.
        // Let's count them:
        const activeUsersCount = poolUsers + hostelUsers + businessUsers; // Placeholder for global active metric

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
}
