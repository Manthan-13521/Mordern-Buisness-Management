import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { Member } from "@/models/Member";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";
import crypto from "crypto";

// Utility to generate the next Member ID for a specific pool
async function getNextMemberId(poolId: string) {
    const lastMember = await Member.findOne({ poolId }, { memberId: 1 }).sort({ createdAt: -1 });
    if (!lastMember || !lastMember.memberId) {
        return "M0001";
    }
    const currentId = parseInt(lastMember.memberId.replace("M", ""));
    const nextId = currentId + 1;
    return `M${nextId.toString().padStart(4, "0")}`;
}

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        await connectDB();
        
        const { searchParams } = new URL(req.url);
        const memberType = searchParams.get("type"); // "swimming" or "entertainment"

        const query: any = { status: { $ne: "deleted" } };
        if (session.user.role !== "superadmin" && session.user.poolId) {
            query.poolId = session.user.poolId;
        }
        
        let members = await Member.find(query)
            .populate("planId", "name durationDays price voiceAlert")
            .sort({ createdAt: -1 });

        return NextResponse.json(members);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const { name, phone, dob, planId, photoBase64, aadharCard, address } = body;

        if (!name || !phone || !planId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        await connectDB();

        // Auto calculate age if dob is provided
        let age = undefined;
        if (dob) {
            const birthDate = new Date(dob);
            const today = new Date();
            age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
        }

        const poolId = session.user.role !== "superadmin" ? session.user.poolId : body.poolId;

        // Generate Member ID specific to this pool
        const memberId = await getNextMemberId(poolId);

        // Handle Photo Upload (save to public/uploads)
        let photoUrl = "";
        if (photoBase64) {
            const base64Data = photoBase64.replace(/^data:image\/\w+;base64,/, "");
            const ext = photoBase64.substring("data:image/".length, photoBase64.indexOf(";base64"));
            const fileName = `${memberId}_photo.${ext}`;
            const uploadPath = path.join(process.cwd(), "public", "uploads", fileName);
            fs.writeFileSync(uploadPath, base64Data, "base64");
            photoUrl = `/uploads/${fileName}`;
        }

        // Generate QR Code containing memberId:qrToken
        const qrToken = crypto.randomUUID();
        const qrCodeDataUrl = await QRCode.toDataURL(`${memberId}:${qrToken}`);

        // Save QR Code as image file for future downloads
        const qrFileName = `${memberId}_qr.png`;
        const qrUploadPath = path.join(process.cwd(), "public", "uploads", qrFileName);
        const qrBase64Data = qrCodeDataUrl.replace(/^data:image\/png;base64,/, "");
        fs.mkdirSync(path.join(process.cwd(), "public", "uploads"), { recursive: true });
        fs.writeFileSync(qrUploadPath, qrBase64Data, "base64");
        const qrCodeUrl = `/uploads/${qrFileName}`;

        // Get plan standard duration to calculate expiry
        // Assuming plan duration lookup is needed, or the client passed startDate/expiryDate
        // For simplicity, we calculate it here based on plan duration
        const { Plan } = await import("@/models/Plan");
        const plan = await Plan.findById(planId);
        if (!plan) return NextResponse.json({ error: "Invalid Plan" }, { status: 400 });

        const startDate = new Date();
        const expiryDate = new Date();
        
        if (plan.durationSeconds) {
            expiryDate.setSeconds(expiryDate.getSeconds() + plan.durationSeconds);
        } else if (plan.durationMinutes) {
            expiryDate.setMinutes(expiryDate.getMinutes() + plan.durationMinutes);
        } else if (plan.durationHours) {
            expiryDate.setHours(expiryDate.getHours() + plan.durationHours);
        } else {
            expiryDate.setDate(startDate.getDate() + (plan.durationDays || 30));
        }

        const newMember = new Member({
            memberId,
            poolId,
            name,
            phone,
            dob: dob ? new Date(dob) : undefined,
            age,
            aadharCard,
            address,
            photoUrl,
            planId,
            planQuantity: 1,
            totalEntriesAllowed: 1,
            entriesUsed: 0,
            startDate,
            expiryDate,
            qrCodeUrl,
            qrToken,
            status: "active",
        });

        await newMember.save();

        return NextResponse.json(newMember, { status: 201 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Server error creating member" }, { status: 500 });
    }
}
