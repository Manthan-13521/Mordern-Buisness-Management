import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { computeDefaulterStatus } from "@/lib/defaulterEngine";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const [session] = await Promise.all([getServerSession(authOptions), dbConnect()]);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });

        const poolId = (session.user as any).poolId;
        if (!poolId) return NextResponse.json({ error: "No pool assigned" }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });

        const { Ledger } = await import("@/models/Ledger");
        const { Subscription } = await import("@/models/Subscription");
        const { Member } = await import("@/models/Member");

        const now = new Date();

        // Get all overdue subscriptions
        const overdueSubs = await Subscription.find({
            poolId,
            status: "active",
            nextDueDate: { $lt: now }
        }).lean();

        const subMap = new Map(overdueSubs.map((s: any) => [s.memberId.toString(), s]));

        // Get all ledgers with positive balance in this pool
        const dueLedgers = await Ledger.find({
            poolId,
            balance: { $gt: 0 },
            memberId: { $in: overdueSubs.map((s: any) => s.memberId) }
        }).lean();

        // Build defaulter list
        const memberIds = dueLedgers.map((l: any) => l.memberId);
        const members = await Member.find({ _id: { $in: memberIds } }).select("name phone memberId").lean();
        const memberMap = new Map(members.map((m: any) => [m._id.toString(), m]));

        const buckets = { active: 0, warning: 0, blocked: 0 };
        const memberList: any[] = [];

        for (const ledger of dueLedgers as any[]) {
            const sub = subMap.get(ledger.memberId.toString());
            if (!sub) continue;

            const msDue = now.getTime() - new Date((sub as any).nextDueDate).getTime();
            const overdueDays = Math.floor(msDue / (1000 * 60 * 60 * 24));
            const status = computeDefaulterStatus(overdueDays);

            buckets[status]++;

            const member = memberMap.get(ledger.memberId.toString());
            memberList.push({
                _id: ledger.memberId,
                memberId: member?.memberId || "N/A",
                name: member?.name || "Unknown",
                phone: member?.phone || "",
                balance: ledger.balance,
                overdueDays,
                status
            });
        }

        // Sort by overdue days descending (worst first)
        memberList.sort((a, b) => b.overdueDays - a.overdueDays);

        return NextResponse.json({ buckets, members: memberList }, {
            headers: { "Cache-Control": "private, max-age=15, stale-while-revalidate=30" }
        });

    } catch (error) {
        console.error("[GET /api/analytics/defaulters]", error);
        return NextResponse.json({ error: "Server error" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}
