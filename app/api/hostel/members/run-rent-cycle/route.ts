import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { HostelMember } from "@/models/HostelMember";
import { HostelLog } from "@/models/HostelLog";
import { resolveUser, AuthUser } from "@/lib/authHelper";
import { isDuplicate, clearDedupe } from "@/lib/idempotency";
import { checkRateLimit, getClientIp, rateLimitHeaders } from "@/lib/rateLimit";
export const dynamic = "force-dynamic";

// POST /api/hostel/members/run-rent-cycle
export async function POST(req: Request) {
    try {
        const user = await resolveUser(req);
        await dbConnect();

        
        if (!user || user.role !== "hostel_admin") {
            return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }
        
        const hostelId = user.hostelId as string;

        // ── RATE LIMITING (very strict: 3/min) ──
        const ip = getClientIp(req);
        const { allowed, limit, remaining } = checkRateLimit(ip, "/api/hostel/members/run-rent-cycle", "POST");
        if (!allowed) {
            return NextResponse.json(
                { error: "Too many requests. Rent cycle is already processing." },
                { status: 429, headers: rateLimitHeaders(limit, remaining) }
            );
        }

        // ── IDEMPOTENCY: Prevent double rent-cycle within 30 seconds ──
        const dedupeKey = `rent-cycle:${hostelId}`;
        if (isDuplicate(dedupeKey, 30_000)) {
            return NextResponse.json(
                { error: "Rent cycle already running. Please wait before retrying." },
                { status: 429 }
            );
        }

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
                performedBy: user.email as string,
            });
        }

        return NextResponse.json({ success: true, processed }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    } catch (error: any) {
        console.error("[POST /api/hostel/members/run-rent-cycle]", error);
        return NextResponse.json({ error: error?.message || "Server error" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}
