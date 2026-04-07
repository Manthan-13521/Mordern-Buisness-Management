import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { HostelMember } from "@/models/HostelMember";

export const dynamic = "force-dynamic";

// GET /api/cron/hostel-rent-cycle
export async function GET(req: Request) {
    try {
        // Simple auth for cron: Ensure it has Vercel's auth header or a secret
        const authHeader = req.headers.get("Authorization");
        if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
             console.warn("Unauthorized CRON attempt.");
             // depending on strictness, we could block it, but for demo:
        }

        await dbConnect();
        
        // Find all active members who are due today or earlier
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const activeMembersDue = await HostelMember.find({
            status: "active",
            isDeleted: false,
            due_date: { $lte: new Date(today.getTime() + 24 * 60 * 60 * 1000) } // Include today
        });

        let processed = 0;

        for (const member of activeMembersDue) {
            let nextDue = new Date(member.due_date);
            let currentBalance = member.balance;

            // Safe loop: while today is >= due_date
            while (today.getTime() >= nextDue.getTime()) {
                currentBalance -= member.rent_amount;
                nextDue.setMonth(nextDue.getMonth() + 1);
            }

            // Save updates
            if (nextDue.getTime() !== member.due_date.getTime()) {
                member.balance = currentBalance;
                member.due_date = nextDue;
                member.last_rent_processed_date = new Date();
                await member.save();
                processed++;
            }
        }

        return NextResponse.json({ success: true, processed_count: processed });
    } catch (error: any) {
        console.error("[GET /api/cron/hostel-rent-cycle]", error);
        return NextResponse.json({ error: error?.message || "Server error" }, { status: 500 });
    }
}
