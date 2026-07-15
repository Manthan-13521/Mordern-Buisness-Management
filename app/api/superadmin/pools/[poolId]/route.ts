import { NextResponse } from "next/server";
import { resolveUser, AuthUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";
import { Pool } from "@/models/Pool";
import { Member } from "@/models/Member";
import { requestContext } from "@/lib/requestContext";

export async function GET(req: Request, props: { params: Promise<{ poolId: string }> }) {

        const requestId = req ? (req.headers.get("x-request-id") || crypto.randomUUID()) : crypto.randomUUID();
        const clientIp = req ? (req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown") : "unknown";
        const routePath = req ? new URL(req.url).pathname : "unknown";
        const requestMethod = "GET";

        return requestContext.run({
            requestId,
            ip: clientIp,
            route: routePath,
            method: requestMethod,
            startTime: Date.now()
        }, async () => {
            try {
            await dbConnect();
            const user = await resolveUser(req);
            if (!user || user.role !== "superadmin") {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }

            const { poolId } = await props.params;
            const pool = await Pool.findOne({ poolId }).lean();
            if (!pool) {
                return NextResponse.json({ error: "Pool not found" }, { status: 404 });
            }

            const [memberCount, paymentCount] = await Promise.all([
                Member.countDocuments({ poolId }),
                (async () => {
                    try {
                        const { Payment } = await import("@/models/Payment");
                        return await Payment.countDocuments({ poolId });
                    } catch { return 0; }
                })()
            ]);

            return NextResponse.json({
                ...pool,
                stats: {
                    members: memberCount,
                    payments: paymentCount
                }
            });
        } catch (error) {
            console.error("Fetch Pool Details Error:", error);
            return NextResponse.json({ error: "Server error" }, { status: 500 });
        }
        });
            
}

export async function PATCH(req: Request, props: { params: Promise<{ poolId: string }> }) {

        const requestId = req ? (req.headers.get("x-request-id") || crypto.randomUUID()) : crypto.randomUUID();
        const clientIp = req ? (req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown") : "unknown";
        const routePath = req ? new URL(req.url).pathname : "unknown";
        const requestMethod = "PATCH";

        return requestContext.run({
            requestId,
            ip: clientIp,
            route: routePath,
            method: requestMethod,
            startTime: Date.now()
        }, async () => {
            try {
            await dbConnect();
            const user = await resolveUser(req);
            if (!user || user.role !== "superadmin") {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }

            const { poolId } = await props.params;
            const { action } = await req.json();

            if (action === "toggle-status") {
                const pool = await Pool.findOne({ poolId });
                if (!pool) return NextResponse.json({ error: "Pool not found" }, { status: 404 });
                
                const newStatus = pool.subscriptionStatus === "paused" ? "active" : "paused";
                pool.subscriptionStatus = newStatus;
                await pool.save();
                return NextResponse.json({ success: true, status: newStatus });
            }

            return NextResponse.json({ error: "Invalid action" }, { status: 400 });
        } catch (error) {
            return NextResponse.json({ error: "Server error" }, { status: 500 });
        }
        });
            
}


export async function DELETE(req: Request, props: { params: Promise<{ poolId: string }> }) {

        const requestId = req ? (req.headers.get("x-request-id") || crypto.randomUUID()) : crypto.randomUUID();
        const clientIp = req ? (req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown") : "unknown";
        const routePath = req ? new URL(req.url).pathname : "unknown";
        const requestMethod = "DELETE";

        return requestContext.run({
            requestId,
            ip: clientIp,
            route: routePath,
            method: requestMethod,
            startTime: Date.now()
        }, async () => {
            try {
            await dbConnect();

            const user = await resolveUser(req);
            if (!user || user.role !== "superadmin") {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }

            const { poolId } = await props.params;
            if (!poolId) {
                return NextResponse.json({ error: "Missing pool ID" }, { status: 400 });
            }
            
            const body = await req.json().catch(() => ({}));
            const confirmationText = body.confirmationText?.trim();

            // Find the pool first
            const pool = await Pool.findOne({ poolId });
            if (!pool) {
                return NextResponse.json({ error: "Pool not found" }, { status: 404 });
            }

            if (confirmationText !== `delete ${pool.poolName}`) {
                return NextResponse.json({ error: "Invalid confirmation text. Deletion aborted." }, { status: 400 });
            }

            const { withTransaction } = await import("@/lib/withTransaction");
            await withTransaction(async (session) => {
                // ── Cascade delete ALL tenant-scoped data ────────────────────────
                // Delete members (both regular and entertainment)
                await Member.deleteMany({ poolId }, { session });
                try {
                    const { EntertainmentMember } = await import("@/models/EntertainmentMember");
                    await EntertainmentMember.deleteMany({ poolId }, { session });
                } catch {}

                // Delete related users, plans, staff, entry logs
                try {
                    const { User } = await import("@/models/User");
                    await User.deleteMany({ poolId }, { session });
                } catch {}
                try {
                    const { Plan } = await import("@/models/Plan");
                    await Plan.deleteMany({ poolId }, { session });
                } catch {}
                try {
                    const { Staff } = await import("@/models/Staff");
                    await Staff.deleteMany({ poolId }, { session });
                } catch {}
                try {
                    const { EntryLog } = await import("@/models/EntryLog");
                    await EntryLog.deleteMany({ poolId }, { session });
                } catch {}

                // Delete payments
                try {
                    const { Payment } = await import("@/models/Payment");
                    await Payment.deleteMany({ poolId }, { session });
                } catch {}

                // Delete ledger, subscriptions, pool stats, analytics
                try {
                    const { Ledger } = await import("@/models/Ledger");
                    await Ledger.deleteMany({ poolId }, { session });
                } catch {}
                try {
                    const { Subscription } = await import("@/models/Subscription");
                    await Subscription.deleteMany({ poolId }, { session });
                } catch {}
                try {
                    const { PoolStats } = await import("@/models/PoolStats");
                    await PoolStats.deleteMany({ poolId }, { session });
                } catch {}
                try {
                    const { PoolAnalytics } = await import("@/models/PoolAnalytics");
                    await PoolAnalytics.deleteMany({ poolId }, { session });
                } catch {}

                // Delete synced unified users for this pool's members
                try {
                    const { UnifiedUser } = await import("@/models/UnifiedUser");
                    await UnifiedUser.deleteMany({ organizationId: poolId }, { session });
                } catch {}

                // ── Invalidate member cache to prevent serving stale data ─────────
                try {
                    const { invalidateCache } = await import("@/lib/membersCache");
                    await invalidateCache(poolId);
                } catch {}

                // Delete the pool itself
                await Pool.deleteOne({ poolId }, { session });
            });

            return NextResponse.json({ message: `Pool "${pool.poolName}" and all associated data deleted successfully` });
        } catch (error) {
            console.error("Delete Pool Error:", error);
            return NextResponse.json({ error: "Server error deleting pool" }, { status: 500 });
        }
        });
            
}
