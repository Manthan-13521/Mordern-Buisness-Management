import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { getToken } from "next-auth/jwt";
import { HostelMember } from "@/models/HostelMember";
import { HostelLog } from "@/models/HostelLog";

export const dynamic = "force-dynamic";

// POST /api/hostel/members/run-rent-cycle
export async function POST(req: Request) {
    try {
        const token = await getToken({ req: req as any });
        
        if (!token || token.role !== "hostel_admin") {
            return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }
        
        const hostelId = token.hostelId as string;
        await dbConnect();

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const activeMembersDue = await HostelMember.find({
            hostelId,
            status: "active",
            isDeleted: false,
            due_date: { $lte: new Date(today.getTime() + 24 * 60 * 60 * 1000) }
        });

        let processed = 0;

        for (const member of activeMembersDue) {
            let nextDue = new Date(member.due_date);
            let currentBalance = member.balance;

            while (today.getTime() >= nextDue.getTime()) {
                currentBalance -= member.rent_amount;
                nextDue.setMonth(nextDue.getMonth() + 1);
            }

            if (nextDue.getTime() !== member.due_date.getTime()) {
                member.balance = currentBalance;
                member.due_date = nextDue;
                member.last_rent_processed_date = new Date();
                await member.save();
                processed++;
            }
        }

        if (processed > 0) {
            await HostelLog.create({
                hostelId,
                type: "system",
                description: `Manual Rent Cycle triggered. Processed dues for ${processed} members.`,
                performedBy: token.email as string,
            });
        }

        return NextResponse.json({ success: true, processed }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    } catch (error: any) {
        console.error("[POST /api/hostel/members/run-rent-cycle]", error);
        return NextResponse.json({ error: error?.message || "Server error" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}
