import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { Pool } from "@/models/Pool";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/super-admin/pools/[id]/subscription
 * Toggles a pool's subscriptionStatus between "active" and "paused".
 */
export async function PATCH(
  req: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();

        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== "superadmin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { status } = body;

        if (status !== "active" && status !== "paused") {
            return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
        }

        const pId = await params;
        const pool = await Pool.findOneAndUpdate(
            { poolId: pId.id },
            { $set: { subscriptionStatus: status } },
            { new: true }
        );

        if (!pool) {
            return NextResponse.json({ error: "Pool not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, pool });
    } catch (error) {
        console.error("[PATCH /api/super-admin/pools/[id]/subscription]", error);
        return NextResponse.json({ error: "Failed to update pool subscription" }, { status: 500 });
    }
}
