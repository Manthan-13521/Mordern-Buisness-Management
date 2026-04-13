import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { Pool } from "@/models/Pool";
import { Member } from "@/models/Member";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function DELETE(req: Request, props: { params: Promise<{ poolId: string }> }) {
    try {
        await dbConnect();

        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== "superadmin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { poolId } = await props.params;
        if (!poolId) {
            return NextResponse.json({ error: "Missing pool ID" }, { status: 400 });
        }

        // Find the pool first
        const pool = await Pool.findOne({ poolId });
        if (!pool) {
            return NextResponse.json({ error: "Pool not found" }, { status: 404 });
        }

        // ── Cascade delete ALL tenant-scoped data ────────────────────────
        // Delete members (both regular and entertainment)
        await Member.deleteMany({ poolId });
        try {
            const { EntertainmentMember } = await import("@/models/EntertainmentMember");
            await EntertainmentMember.deleteMany({ poolId });
        } catch {}

        // Delete related users, plans, staff, entry logs
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

        // Delete payments
        try {
            const { Payment } = await import("@/models/Payment");
            await Payment.deleteMany({ poolId });
        } catch {}

        // Delete ledger, subscriptions, pool stats, analytics
        try {
            const { Ledger } = await import("@/models/Ledger");
            await Ledger.deleteMany({ poolId });
        } catch {}
        try {
            const { Subscription } = await import("@/models/Subscription");
            await Subscription.deleteMany({ poolId });
        } catch {}
        try {
            const { PoolStats } = await import("@/models/PoolStats");
            await PoolStats.deleteMany({ poolId });
        } catch {}
        try {
            const { PoolAnalytics } = await import("@/models/PoolAnalytics");
            await PoolAnalytics.deleteMany({ poolId });
        } catch {}

        // Delete synced unified users for this pool's members
        try {
            const { UnifiedUser } = await import("@/models/UnifiedUser");
            await UnifiedUser.deleteMany({ organizationId: poolId });
        } catch {}

        // ── Invalidate member cache to prevent serving stale data ─────────
        try {
            const { invalidateCache } = await import("@/lib/membersCache");
            await invalidateCache(poolId);
        } catch {}

        // Delete the pool itself
        await Pool.deleteOne({ poolId });

        return NextResponse.json({ message: `Pool "${pool.poolName}" and all associated data deleted successfully` });
    } catch (error) {
        console.error("Delete Pool Error:", error);
        return NextResponse.json({ error: "Server error deleting pool" }, { status: 500 });
    }
}
