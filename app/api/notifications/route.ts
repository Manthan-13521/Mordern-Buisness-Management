import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { NotificationLog } from "@/models/NotificationLog";
import { Member } from "@/models/Member";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        await connectDB();
        const baseMatch = session.user.role !== "superadmin" && session.user.poolId ? { poolId: session.user.poolId } : {};

        const logs = await NotificationLog.find({ ...baseMatch })
            .populate("memberId", "name memberId phone")
            .sort({ date: -1 })
            .limit(100);

        return NextResponse.json(logs);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to fetch notification logs" }, { status: 500 });
    }
}
