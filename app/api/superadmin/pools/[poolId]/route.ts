import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { Pool } from "@/models/Pool";
import { Member } from "@/models/Member";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function DELETE(req: Request, props: { params: Promise<{ poolId: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== "superadmin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { poolId } = await props.params;
        if (!poolId) {
            return NextResponse.json({ error: "Missing pool ID" }, { status: 400 });
        }

        await connectDB();

        // Find the pool first
        const pool = await Pool.findOne({ poolId });
        if (!pool) {
            return NextResponse.json({ error: "Pool not found" }, { status: 404 });
        }

        // Delete all members belonging to this pool
        await Member.deleteMany({ poolId });

        // Delete related users, plans, staff, etc.
        try {
            const { User } = await import("@/models/User");
            await User.deleteMany({ poolId });
        } catch {}
        try {
            const { Plan } = await import("@/models/Plan");
            await Plan.deleteMany({ poolId });
        } catch {}
        try {
            const { Staff } = await import("@/models/Staff");
            await Staff.deleteMany({ poolId });
        } catch {}
        try {
            const { EntryLog } = await import("@/models/EntryLog");
            await EntryLog.deleteMany({ poolId });
        } catch {}
        try {
            const { Payment } = await import("@/models/Payment");
            await Payment.deleteMany({ poolId });
        } catch {}

        // Delete the pool itself
        await Pool.deleteOne({ poolId });

        return NextResponse.json({ message: `Pool "${pool.poolName}" and all associated data deleted successfully` });
    } catch (error) {
        console.error("Delete Pool Error:", error);
        return NextResponse.json({ error: "Server error deleting pool" }, { status: 500 });
    }
}
