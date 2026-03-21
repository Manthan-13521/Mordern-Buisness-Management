import { PoolSession } from "@/models/PoolSession";
import { dbConnect } from "./mongodb";

export async function runOccupancyCleanupInBackground() {
    try {
        await dbConnect();
        const now = new Date();
        const expiredSessions = await PoolSession.find({
            status: "active",
            expiryTime: { $lte: now }
        });

        if (expiredSessions.length === 0) return;

        for (const session of expiredSessions) {
            session.status = "completed";
            await session.save();
        }
    } catch (error) {
        console.error("Cleanup error in background:", error);
    }
}
