import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { HostelMember } from "@/models/HostelMember";
import { HostelPaymentLog } from "@/models/HostelPaymentLog";
import { CronLog } from "@/models/CronLog";

export const dynamic = "force-dynamic";

async function executeRentCycle() {
    await dbConnect();
        
    // Find all active members who are due today or earlier
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // Fetch members natively
    const activeMembersDue = await HostelMember.find({
        status: "active",
        isDeleted: false,
        due_date: { $lte: new Date(today.getTime() + 24 * 60 * 60 * 1000) } // Include today
    });

    let processed = 0;
    const transactions = [];

    for (const member of activeMembersDue) {
        let nextDue = new Date(member.due_date);
        let currentBalance = member.balance;
        let deductionsMade = 0;

        // Safe loop: while today is >= due_date
        while (today.getTime() >= nextDue.getTime()) {
            currentBalance -= member.rent_amount;
            deductionsMade += 1;
            
            transactions.push({
                hostelId: member.hostelId,
                memberId: member._id,
                memberName: member.name,
                amount: -member.rent_amount,
                paymentType: "rent",
                payment_date: new Date(nextDue),
                createdBy: "SYSTEM_CRON"
            });

            nextDue.setMonth(nextDue.getMonth() + 1);
        }

        // Save updates
        if (deductionsMade > 0) {
            member.balance = currentBalance;
            member.due_date = nextDue;
            
            // Defaulter conversion matrix explicitly injected here natively
            if (currentBalance < 0 && member.status === "active") {
                member.status = "defaulter";
            }
            
            member.last_rent_processed_date = new Date();
            await member.save();
            processed++;
        }
    }

    if (transactions.length > 0) {
        await HostelPaymentLog.insertMany(transactions);
    }

    return { processed, transactions: transactions.length };
}

export async function GET(req: Request) {
    if (req.headers.get("Authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const jobName = "hostel-rent-cycle";
    const log = await CronLog.create({ jobName, status: "running" });

    try {
        const stats = await executeRentCycle();
        
        log.status = "success";
        log.completedAt = new Date();
        log.metadata = stats;
        await log.save();

        return NextResponse.json({ success: true, ...stats });
    } catch (error: any) {
        console.error(`[CRON ERROR] ${jobName}:`, error);

        // RETRY ONCE
        try {
            console.log(`[CRON RETRY] ${jobName} retrying once...`);
            const retryStats = await executeRentCycle();
            log.status = "success";
            log.metadata = { ...retryStats, retried: true };
            log.completedAt = new Date();
            await log.save();
            return NextResponse.json({ success: true, ...retryStats });
        } catch (retryErr: any) {
            log.status = "failed";
            log.error = error.message || String(error);
            log.completedAt = new Date();
            await log.save();
            return NextResponse.json({ error: "CRON failed globally" }, { status: 500 });
        }
    }
}
