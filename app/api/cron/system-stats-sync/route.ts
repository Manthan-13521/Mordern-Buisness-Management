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

        // Get total pool organizations
        const poolCount = await Pool.countDocuments({});

        // Get total hostel organizations
        const hostelCount = await Hostel.countDocuments({});

        // Get total business organizations
        const businessCount = await Business.countDocuments({});

        // Get total members across all systems
        const poolMembers = await Member.countDocuments({});
        const hostelMembers = await HostelMember.countDocuments({});
        const businessMembers = await BusinessCustomer.countDocuments({});
        const totalMembers = poolMembers + hostelMembers + businessMembers;

        await SystemStats.findOneAndUpdate(
            { month: monthKey },
            {
                $set: {
                    poolUsers: poolCount,      // Now representing organization count
                    hostelUsers: hostelCount,  // Now representing organization count
                    businessUsers: businessCount, // Now representing organization count
                    activeUsers: totalMembers  // Now representing total system members
                }
            },
            { upsert: true, new: true }
        );

        return NextResponse.json({ success: true, month: monthKey });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
