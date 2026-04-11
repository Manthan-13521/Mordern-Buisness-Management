import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { Member } from "@/models/Member";
import { Plan } from "@/models/Plan";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
    try {
        await dbConnect();

        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });

        // Ensure Plan model is loaded before populate
        await Plan.findOne({}).lean();

        const now = new Date();

        const baseMatch = session.user.role !== "superadmin" ? { poolId: session.user.poolId || "UNASSIGNED_POOL" } : {};

        // Find all active members past expiry
        const expiredMembersRaw = await Member.find({
            ...baseMatch,
            status: "active",
            expiryDate: { $lte: now }
        }).populate("planId").lean();

        if (expiredMembersRaw.length === 0) {
            return NextResponse.json({ alerts: [] }, {  status: 200 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
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

        return NextResponse.json({ alerts }, {  status: 200 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });

    } catch (error) {
        console.error("Voice Alert Polling Error:", error);
        return NextResponse.json({ error: "Server Error" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}
