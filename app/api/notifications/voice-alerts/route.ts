import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { Member } from "@/models/Member";
import { Plan } from "@/models/Plan";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        await connectDB();

        // Ensure Plan model is loaded before populate
        await Plan.findOne({});

        const now = new Date();

        const baseMatch = session.user.role !== "superadmin" && session.user.poolId ? { poolId: session.user.poolId } : {};

        // Find all active members past expiry
        const expiredMembersRaw = await Member.find({
            ...baseMatch,
            status: "active",
            expiryDate: { $lte: now }
        }).populate("planId");

        if (expiredMembersRaw.length === 0) {
            return NextResponse.json({ alerts: [] }, { status: 200 });
        }

        // Set ALL expired members to "expired" globally so they drop off the "Active" lists
        const allExpiredIds = expiredMembersRaw.map(m => m._id);
        await Member.updateMany(
            { _id: { $in: allExpiredIds } },
            { $set: { status: "expired" } }
        );

        // Filter ONLY those whose plan specifically has voiceAlert === true for the speaker
        const voiceAlertMembers = expiredMembersRaw.filter(member => {
            const plan = member.planId as any;
            return plan && plan.voiceAlert === true;
        });

        // Format names to pass back to frontend speaker
        const alerts = voiceAlertMembers.map(m => {
            const planName = (m.planId as any).name;
            const quantityText = m.planQuantity && m.planQuantity > 1 ? ` times ${m.planQuantity}` : "";
            return {
                name: m.name,
                planName,
                quantityText,
            };
        });

        return NextResponse.json({ alerts }, { status: 200 });

    } catch (error) {
        console.error("Voice Alert Polling Error:", error);
        return NextResponse.json({ error: "Server Error" }, { status: 500 });
    }
}
