import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { Member } from "@/models/Member";
import { EntertainmentMember } from "@/models/EntertainmentMember";
import { PoolSession } from "@/models/PoolSession";
import { Payment } from "@/models/Payment";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import QRCode from "qrcode";
import crypto from "crypto";
import { uploadBase64Image, uploadBuffer } from "@/lib/local-upload";

export const dynamic = "force-dynamic";

/**
 * Atomic member ID generator — uses MongoDB $inc on Plan.memberCounter
 * to prevent race conditions that caused M0001 collisions.
 */
async function getNextMemberId(
    planId: string,
    isEntertainment: boolean
): Promise<string> {
    const { Plan } = await import("@/models/Plan");

    const field = isEntertainment
        ? "entertainmentMemberCounter"
        : "memberCounter";

    const updatedPlan = await Plan.findByIdAndUpdate(
        planId,
        { $inc: { [field]: 1 } },
        { new: true, upsert: false }
    );

    if (!updatedPlan) throw new Error("Plan not found");

    const counter = isEntertainment
        ? updatedPlan.entertainmentMemberCounter
        : updatedPlan.memberCounter;

    const prefix = isEntertainment ? "MS" : "M";
    return `${prefix}${counter.toString().padStart(4, "0")}`;
}

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user)
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        await connectDB();

        const url = new URL(req.url);
        const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
        const limit = Math.min(
            100,
            Math.max(1, parseInt(url.searchParams.get("limit") ?? "20"))
        );
        const skip = (page - 1) * limit;

        // Build tenant-isolated query — never return deleted members by default
        const query: Record<string, unknown> = { isDeleted: false };
        if (session.user.role !== "superadmin" && session.user.poolId) {
            query.poolId = session.user.poolId;
        }

        // Optional filters
        const search = url.searchParams.get("search");
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: "i" } },
                { phone: { $regex: search, $options: "i" } },
                { memberId: { $regex: search, $options: "i" } },
            ];
        }
        const planFilter = url.searchParams.get("planId");
        if (planFilter) query.planId = planFilter;

        const statusFilter = url.searchParams.get("status");
        if (statusFilter === "active") query.isExpired = false;
        if (statusFilter === "expired") query.isExpired = true;

        const balanceOnly = url.searchParams.get("balanceOnly");
        if (balanceOnly === "true") query.balanceAmount = { $gt: 0 };

        // Query both Member and EntertainmentMember collections
        const populateFields = "name durationDays durationHours durationMinutes price voiceAlert hasTokenPrint quickDelete";
        const [regularMembers, regularTotal, entertainmentMembers, entertainmentTotal] = await Promise.all([
            Member.find(query)
                .populate("planId", populateFields)
                .sort({ createdAt: -1 })
                .lean(),
            Member.countDocuments(query),
            EntertainmentMember.find(query)
                .populate("planId", populateFields)
                .sort({ createdAt: -1 })
                .lean(),
            EntertainmentMember.countDocuments(query),
        ]);

        // Tag entertainment members and merge
        const taggedEntertainment = entertainmentMembers.map((m: any) => ({ ...m, _source: "entertainment" }));
        const allMembers = [...regularMembers, ...taggedEntertainment]
            .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        const combinedTotal = regularTotal + entertainmentTotal;
        const paged = allMembers.slice(skip, skip + limit);

        return NextResponse.json({
            data: paged,
            total: combinedTotal,
            page,
            limit,
            totalPages: Math.ceil(combinedTotal / limit),
        });
    } catch (error) {
        console.error("[GET /api/members]", error);
        return NextResponse.json(
            { error: "Failed to fetch members" },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user)
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const {
            name,
            phone,
            planId,
            photoBase64,
            planQuantity = 1,
            paidAmount = 0,
            balanceAmount = 0,
        } = body;

        if (!name || !phone || !planId) {
            return NextResponse.json(
                { error: "Missing required fields: name, phone, planId" },
                { status: 400 }
            );
        }

        await connectDB();

        const { Plan } = await import("@/models/Plan");
        const plan = await Plan.findById(planId);
        if (!plan)
            return NextResponse.json({ error: "Invalid Plan" }, { status: 400 });

        const poolId =
            session.user.role !== "superadmin"
                ? session.user.poolId
                : body.poolId;

        if (!poolId)
            return NextResponse.json(
                { error: "Pool ID required" },
                { status: 400 }
            );

        // Atomic ID generation via $inc (no race conditions)
        const isEntertainment = plan.hasEntertainment ?? false;
        const memberId = await getNextMemberId(planId, isEntertainment);

        // Upload photo to Cloudinary (skip if not configured)
        let photoUrl = "";
        if (photoBase64) {
            try {
                photoUrl = await uploadBase64Image(
                    photoBase64,
                    "swimming-pool/photos",
                    `${poolId}_${memberId}_photo`
                );
            } catch (uploadErr) {
                console.warn("Cloudinary photo upload failed, skipping:", uploadErr);
            }
        }

        // Generate and upload QR code
        const qrToken = crypto.randomUUID();
        let qrCodeUrl = "";
        try {
            const qrPngBuffer = await QRCode.toBuffer(
                `${memberId}:${qrToken}`,
                { width: 300 }
            );
            qrCodeUrl = await uploadBuffer(
                qrPngBuffer,
                "swimming-pool/qrcodes",
                `${poolId}_${memberId}_qr`
            );
        } catch {
            try {
                qrCodeUrl = await QRCode.toDataURL(`${memberId}:${qrToken}`, {
                    width: 300,
                });
            } catch {
                console.warn("QR generation failed");
            }
        }

        // Calculate plan end date — duration is NOT multiplied by qty
        // Qty means N people using the same plan, not extended duration
        const qty = Math.min(25, Math.max(1, planQuantity || 1));
        const startDate = new Date();
        const planEndDate = new Date();

        if (plan.durationSeconds) {
            planEndDate.setSeconds(planEndDate.getSeconds() + plan.durationSeconds);
        } else if (plan.durationMinutes) {
            planEndDate.setMinutes(planEndDate.getMinutes() + plan.durationMinutes);
        } else if (plan.durationHours) {
            planEndDate.setHours(planEndDate.getHours() + plan.durationHours);
        } else {
            planEndDate.setDate(planEndDate.getDate() + (plan.durationDays || 30));
        }

        const paymentStatus =
            balanceAmount <= 0 ? "paid" : paidAmount > 0 ? "partial" : "pending";

        // Build equipment array from string (if provided)
        let equipmentArr: { itemName: string; issuedDate: Date; isReturned: boolean }[] = [];
        if (body.equipmentTaken && typeof body.equipmentTaken === "string") {
            equipmentArr = body.equipmentTaken
                .split(",")
                .map((s: string) => s.trim())
                .filter(Boolean)
                .map((item: string) => ({
                    itemName: item,
                    issuedDate: new Date(),
                    isReturned: false,
                }));
        }

        const MemberModel = isEntertainment ? EntertainmentMember : Member;

        const newMember = new MemberModel({
            memberId,
            poolId,
            name,
            phone,
            photoUrl,
            planId,
            planQuantity: qty,
            planStartDate: startDate,
            planEndDate,
            startDate,
            expiryDate: planEndDate,
            paidAmount,
            balanceAmount,
            paymentStatus,
            paymentMode: body.paymentMode ?? "cash",
            equipmentTaken: equipmentArr,
            faceScanEnabled: plan.hasFaceScan ?? false,
            faceDescriptor: body.faceDescriptor ?? [],
            qrCodeUrl,
            qrToken,
            isActive: true,
            isExpired: false,
            isDeleted: false,
            status: "active",
        });

        await newMember.save();

        // Create a PoolSession so occupancy updates immediately
        try {
            await PoolSession.create({
                memberId: newMember._id,
                poolId,
                numPersons: qty,
                entryTime: startDate,
                expiryTime: planEndDate,
                status: "active",
            });
        } catch (sessionErr) {
            console.warn("PoolSession creation failed (non-critical):", sessionErr);
        }

        // Auto-create Payment record so it shows on the Payments page
        if (paidAmount > 0) {
            try {
                const modeMap: Record<string, string> = { cash: "cash", upi: "upi", card: "cash", online: "razorpay_online" };
                await Payment.create({
                    memberId: newMember._id,
                    planId,
                    poolId,
                    memberCollection: isEntertainment ? "entertainment_members" : "members",
                    amount: paidAmount,
                    paymentMethod: modeMap[body.paymentMode] || "cash",
                    recordedBy: session.user.id,
                    status: "success",
                    notes: `Auto-recorded on member registration`,
                });
            } catch (payErr) {
                console.warn("Payment creation failed (non-critical):", payErr);
            }
        }

        // Populate plan for response (needed for token print check on frontend)
        const savedMember = isEntertainment
            ? await EntertainmentMember.findById(newMember._id).populate("planId", "name hasTokenPrint quickDelete price")
            : await Member.findById(newMember._id).populate("planId", "name hasTokenPrint quickDelete price");

        return NextResponse.json(savedMember, { status: 201 });
    } catch (error) {
        console.error("[POST /api/members]", error);
        return NextResponse.json(
            { error: "Server error creating member" },
            { status: 500 }
        );
    }
}
