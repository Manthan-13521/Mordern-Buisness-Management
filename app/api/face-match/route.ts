import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { Member } from "@/models/Member";
import { EntertainmentMember } from "@/models/EntertainmentMember";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * POST /api/face-match
 * Accepts a face descriptor (128-dim array) and finds the matching member.
 * Uses Euclidean distance with a threshold of 0.6.
 */
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user)
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const { descriptor } = body;

        if (!descriptor || !Array.isArray(descriptor) || descriptor.length !== 128) {
            return NextResponse.json(
                { error: "Invalid face descriptor. Must be a 128-element array." },
                { status: 400 }
            );
        }

        await dbConnect();

        const poolId =
            session.user.role !== "superadmin"
                ? session.user.poolId
                : body.poolId;

        // Fetch all members with face descriptors in this pool
        const [members, entMembers] = await Promise.all([
            Member.find({
                poolId,
                faceDescriptor: { $exists: true, $ne: [] },
                isDeleted: false,
                status: "active",
            })
                .select("memberId name phone faceDescriptor photoUrl planId expiryDate planEndDate planQuantity")
                .populate("planId", "name")
                .lean(),
            EntertainmentMember.find({
                poolId,
                faceDescriptor: { $exists: true, $ne: [] },
                isDeleted: false,
                status: "active",
            })
                .select("memberId name phone faceDescriptor photoUrl planId expiryDate planEndDate planQuantity")
                .populate("planId", "name")
                .lean(),
        ]);

        const allMembers = [...members, ...entMembers];

        if (allMembers.length === 0) {
            return NextResponse.json(
                { matched: false, message: "No members with face data found" },
                { status: 200 }
            );
        }

        // Find best match using Euclidean distance
        let bestMatch: any = null;
        let bestDistance = Infinity;
        const THRESHOLD = 0.6; // standard face-api.js threshold

        for (const member of allMembers) {
            if (!member.faceDescriptor || member.faceDescriptor.length !== 128) continue;

            let distance = 0;
            for (let i = 0; i < 128; i++) {
                const diff = descriptor[i] - member.faceDescriptor[i];
                distance += diff * diff;
            }
            distance = Math.sqrt(distance);

            if (distance < bestDistance) {
                bestDistance = distance;
                bestMatch = member;
            }
        }

        if (bestMatch && bestDistance < THRESHOLD) {
            return NextResponse.json({
                matched: true,
                distance: bestDistance,
                member: {
                    _id: bestMatch._id,
                    memberId: bestMatch.memberId,
                    name: bestMatch.name,
                    phone: bestMatch.phone,
                    photoUrl: bestMatch.photoUrl,
                    planName: bestMatch.planId?.name ?? "N/A",
                    planQuantity: bestMatch.planQuantity,
                    expiryDate: bestMatch.planEndDate ?? bestMatch.expiryDate,
                },
            });
        }

        return NextResponse.json({
            matched: false,
            bestDistance: bestDistance === Infinity ? null : bestDistance,
            message: "No matching face found",
        });
    } catch (error: any) {
        console.error("[POST /api/face-match]", error);
        return NextResponse.json(
            { error: "Face match failed" },
            { status: 500 }
        );
    }
}
