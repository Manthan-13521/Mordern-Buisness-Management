import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { UnifiedUser } from "@/models/UnifiedUser";

/**
 * QStash Worker Endpoint for Dual-Write Synchronization.
 * Called asynchronously when the primary sync hook fails.
 */
export async function POST(req: Request) {
    try {
        // QStash payload parsing
        const body = await req.json();
        const { memberId, type, data: doc } = body;

        if (!memberId || !doc) {
            return NextResponse.json({ error: "Missing memberId or doc payload" }, { status: 400 });
        }

        await dbConnect();

        // Perform the sync logic
        const orgId = type === "hostel" ? doc.hostelId : (doc.organizationId || doc.poolId);
        let accessState = doc.accessState || "active";
        
        // Match hostel blocking logic
        if (type === "hostel" && doc.balance && doc.balance > 0 && doc.status === "active") {
            accessState = "blocked";
        }

        await UnifiedUser.findOneAndUpdate(
            { originalId: doc._id || memberId },
            {
                $set: {
                    organizationId: orgId,
                    name: doc.name,
                    phone: doc.phone,
                    type: type,
                    accessState: accessState,
                    cachedBalance: doc.balance || doc.cachedBalance || 0,
                }
            },
            { upsert: true, new: true }
        );

        return NextResponse.json({ success: true, message: "Sync processed via QStash" });
    } catch (error: any) {
        console.error("[QStash Worker] Sync failed:", error);
        // Returning 500 triggers QStash exponential backoff retry automatically
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
