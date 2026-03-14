import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { EntryLog } from "@/models/EntryLog";
import { Payment } from "@/models/Payment";
import { Member } from "@/models/Member";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const filterType = searchParams.get("type") || "all";

        await connectDB();

        const baseMatch = session.user.role !== "superadmin" && session.user.poolId ? { poolId: session.user.poolId } : {};

        const unifiedLogs: any[] = [];

        // 1. Fetch Entry Logs
        if (filterType === "all" || filterType === "entry") {
            const entries = await EntryLog.find({ ...baseMatch })
                .populate("memberId", "name memberId")
                .sort({ scanTime: -1 })
                .limit(50)
                .lean();

            entries.forEach((e: any) => {
                unifiedLogs.push({
                    id: `entry_${e._id}`,
                    date: e.scanTime,
                    type: "Entry Scan",
                    description: `Entry ${e.status.toUpperCase()} ${e.reason ? `(${e.reason})` : ""}${e.status === "denied" && e.rawPayload ? ` [Raw: ${e.rawPayload}]` : ""}`,
                    member: e.memberId?.name || (e.rawPayload ? "Unknown / Not Found" : "Unknown"),
                    memberId: e.memberId?.memberId || "N/A",
                });
            });
        }

        // 2. Fetch Payment Logs
        if (filterType === "all" || filterType === "payment") {
            const payments = await Payment.find({ ...baseMatch })
                .populate("memberId", "name memberId")
                .sort({ date: -1 })
                .limit(50)
                .lean();

            payments.forEach((p: any) => {
                unifiedLogs.push({
                    id: `payment_${p._id}`,
                    date: p.date,
                    type: "Payment",
                    description: `₹${p.amount} via ${p.paymentMethod.toUpperCase()} (${p.status})`,
                    member: p.memberId?.name || "Unknown",
                    memberId: p.memberId?.memberId || "N/A",
                });
            });
        }

        // 3. Fetch Registration Logs (using Member createdAt)
        if (filterType === "all" || filterType === "registration") {
            const registrations = await Member.find({ ...baseMatch })
                .sort({ createdAt: -1 })
                .limit(50)
                .lean();

            registrations.forEach((m: any) => {
                unifiedLogs.push({
                    id: `reg_${m._id}`,
                    date: m.createdAt,
                    type: "Registration",
                    description: `New member registered`,
                    member: m.name,
                    memberId: m.memberId,
                });
            });
        }

        // Sort combined logs by date descending and limit to top 100
        unifiedLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const finalLogs = unifiedLogs.slice(0, 100);

        return NextResponse.json(finalLogs);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
    }
}
