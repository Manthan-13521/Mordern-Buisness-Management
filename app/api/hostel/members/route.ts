import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { getToken } from "next-auth/jwt";
import { HostelMember } from "@/models/HostelMember";
import { HostelPayment } from "@/models/HostelPayment";
import { HostelLog } from "@/models/HostelLog";
import { HostelPlan } from "@/models/HostelPlan";
import { HostelAnalytics } from "@/models/HostelAnalytics";
import { Hostel } from "@/models/Hostel";
import { HostelBlock } from "@/models/HostelBlock";
import { HostelFloor } from "@/models/HostelFloor";
import { HostelRoom } from "@/models/HostelRoom";
import mongoose from "mongoose";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { HostelRegistrationLog } from "@/models/HostelRegistrationLog";
import { HostelPaymentLog } from "@/models/HostelPaymentLog";

export const dynamic = "force-dynamic";

// ─── GET: list members (paginated + search + filters) ────────────────────────
export async function GET(req: Request) {
    try {
        const [token] = await Promise.all([getToken({ req: req as any }), dbConnect()]);
        if (!token || token.role !== "hostel_admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const hostelId = token.hostelId as string;
        if (!hostelId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        const url = new URL(req.url);
        const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
        const limit = 11;
        const skip = (page - 1) * limit;
        const search = url.searchParams.get("search") || "";
        const statusFilter = url.searchParams.get("status") || "";
        const blockFilter = url.searchParams.get("block") || "";

        const baseMatch: Record<string, unknown> = { hostelId, isDeleted: false };
        if (search) baseMatch.$text = { $search: search };
        if (statusFilter === "active") { baseMatch.status = "active"; baseMatch.balance = { $gte: 0 }; }
        if (statusFilter === "expired") { baseMatch.status = "active"; baseMatch.balance = { $lt: 0 }; }
        if (blockFilter) {
            const b = await HostelBlock.findOne({ hostelId, name: blockFilter }).lean() as any;
            if (b) baseMatch.blockId = b._id;
            else baseMatch.roomId = new mongoose.Types.ObjectId(); // arbitrary ID that won't match to force 0 results
        }

        const [members, total] = await Promise.all([
            HostelMember.find(baseMatch)
                .populate("planId", "name durationDays price")
                .populate("blockId", "name")
                .populate("roomId", "roomNo")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            HostelMember.countDocuments(baseMatch),
        ]);

        const formattedMembers = members.map((m: any) => {
            let brn = m.block_room_no || "";
            let rNo = m.roomNo || "";
            if (m.blockId && m.roomId) {
               brn = `${m.blockId.name}-${m.roomId.roomNo}-${m.bedNo}`;
               rNo = m.roomId.roomNo;
            }
            return { ...m, block_room_no: brn, roomNo: rNo };
        });

        return NextResponse.json({ data: formattedMembers, total, page, limit, totalPages: Math.ceil(total / limit) });
    } catch (error) {
        console.error("[GET /api/hostel/members]", error);
        return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 });
    }
}

// ─── POST: create new member (with race-condition protection via DB transaction) ─
export async function POST(req: Request) {
    try {
        const token = await getToken({ req: req as any });
        await dbConnect();
        if (!token || token.role !== "hostel_admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const hostelId = token.hostelId as string;
        if (!hostelId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Support both JSON and FormData (photo upload)
        const contentType = req.headers.get("content-type") || "";
        let body: Record<string, any> = {};
        let photoFile: File | null = null;

        if (contentType.includes("multipart/form-data")) {
            const fd = await req.formData();
            for (const [key, val] of fd.entries()) {
                if (key === "photo" && val instanceof File && val.size > 0) {
                    photoFile = val;
                } else {
                    body[key] = val;
                }
            }
        } else {
            body = await req.json();
        }

        const { name, phone, planId, blockNo, floorNo, roomNo, paymentMode, paidAmount, notes, collegeName, bedNo: explicitBedNo } = body;

        if (!name || !phone || !planId || !blockNo || !floorNo || !roomNo) {
            return NextResponse.json({ error: "Missing required fields: name, phone, planId, blockNo, floorNo, roomNo" }, { status: 400 });
        }

        // Validate plan
        const plan = await HostelPlan.findOne({ _id: planId, hostelId, isActive: true }).lean() as any;
        if (!plan) {
            return NextResponse.json({ error: "Invalid or inactive plan" }, { status: 400 });
        }

        // ── Server-side check ──
        const blockObj = await HostelBlock.findOne({ hostelId, name: blockNo }).lean() as any;
        if (!blockObj) {
            return NextResponse.json({ error: "Block not found" }, { status: 404 });
        }
        
        const floorObj = await HostelFloor.findOne({ hostelId, blockId: blockObj._id, floorNo }).lean() as any;
        if (!floorObj) {
            return NextResponse.json({ error: "Floor not found" }, { status: 404 });
        }

        const roomObj = await HostelRoom.findOne({ hostelId, floorId: floorObj._id, roomNo }).lean() as any;
        if (!roomObj) {
            return NextResponse.json({ error: "Room not found" }, { status: 404 });
        }

        // Record member registration without transaction
        let memberObjId;

        try {
            const existingMembers = await HostelMember.find({ hostelId, roomId: roomObj._id, isActive: true, isDeleted: false }).select("bedNo").lean();
            
            if (existingMembers.length >= (roomObj.capacity || 1)) {
                return NextResponse.json(
                    { error: `Room ${roomNo} (Block ${blockNo}) just reached maximum capacity. Please select a different room.` },
                    { status: 409 }
                );
            }

            let finalBedNo: number;

            if (explicitBedNo) {
                finalBedNo = parseInt(explicitBedNo, 10);
                if (finalBedNo < 1 || finalBedNo > (roomObj.capacity || 1)) {
                    return NextResponse.json({ error: `Bed ${finalBedNo} is outside room capacity (Max ${roomObj.capacity}).` }, { status: 400 });
                }
                const isBedOccupied = existingMembers.some((m: any) => m.bedNo === finalBedNo);
                if (isBedOccupied) {
                    return NextResponse.json({ error: `Bed ${finalBedNo} in Room ${roomNo} is already occupied.` }, { status: 409 });
                }
            } else {
                // Auto-assign: Find the first available explicitly vacant bed slot 1 through capacity.
                let availableBed = 1;
                while (existingMembers.some((m: any) => m.bedNo === availableBed) && availableBed <= (roomObj.capacity || 1)) {
                    availableBed++;
                }
                finalBedNo = availableBed;
            }

            const bedNo = finalBedNo;

            // Handle photo upload
            let photoUrl: string | undefined;
            if (photoFile) {
                try {
                    const ext = photoFile.name.split(".").pop() || "jpg";
                    const filename = `${hostelId}_${Date.now()}.${ext}`;
                    const uploadDir = path.join(process.cwd(), "public", "uploads", "hostel-members");
                    await mkdir(uploadDir, { recursive: true });
                    const buffer = Buffer.from(await photoFile.arrayBuffer());
                    await writeFile(path.join(uploadDir, filename), buffer);
                    photoUrl = `/uploads/hostel-members/${filename}`;
                } catch (photoError) {
                    console.warn("[POST /api/hostel/members] Photo save failed (non-fatal):", photoError);
                }
            }

            // Generate member ID safely
            const hostel = await Hostel.findOneAndUpdate(
                { hostelId },
                { $inc: { memberCounter: 1 } },
                { returnDocument: 'after' }
            ).lean() as any;
            
            const memberId = `HM${String(hostel?.memberCounter ?? 1).padStart(3, "0")}`;

            // --- Ledger Billing Setup ---
            const rent_amount = plan.price; // Use plan price as the active rent base
            const paid = Number(paidAmount) || 0;
            
            // Immediately charge the first month's rent
            let currentBalance = paid - rent_amount;
            let nextDue = new Date();
            nextDue.setMonth(nextDue.getMonth() + (plan.durationDays >= 30 ? (plan.durationDays / 30) : 1)); // usually +1 month

            // Auto-consume any extra advance payments
            while (currentBalance >= rent_amount) {
                currentBalance -= rent_amount;
                nextDue.setMonth(nextDue.getMonth() + 1);
            }

            const memberPayload = {
                memberId, hostelId, name, phone, collegeName,
                roomId: roomObj._id, blockId: blockObj._id, floorId: floorObj._id, bedNo,
                planId: new mongoose.Types.ObjectId(planId),
                rent_amount, due_date: nextDue, balance: currentBalance, last_rent_processed_date: new Date(),
                paymentMode: paymentMode || "cash",
                notes, photoUrl, isActive: true, isDeleted: false, status: "active",
            };

            const createdMember = await HostelMember.create(memberPayload);

            memberObjId = createdMember._id;

            // Create payment record
            if (paid > 0) {
                const paymentPayload = {
                    hostelId, memberId: createdMember._id, planId: createdMember.planId,
                    amount: paid, paymentMethod: paymentMode || "cash", status: "success", paymentType: "initial",
                };
                await HostelPayment.create(paymentPayload);
            }

            // Hybrid Analytics: Record member join & initial payment using EVENT DATE (not system date)
            const joinDate = new Date(); // join_date IS now for new registrations
            const joinYearMonth = `${joinDate.getFullYear()}-${String(joinDate.getMonth() + 1).padStart(2, "0")}`;
            const analyticsInc: any = { newMembers: 1 };
            // Only count real inbound income types
            if (paid > 0) analyticsInc.totalIncome = paid;

            await HostelAnalytics.updateOne(
                { hostelId, yearMonth: joinYearMonth },
                { $inc: analyticsInc },
                { upsert: true }
            );

            // Structured Logs: Registration & Initial Payment
            const createdByName = (token.name || token.email || "Admin") as string;

            const regLogPayload = {
                hostelId,
                memberId: createdMember.memberId,
                memberName: createdMember.name,
                roomNumber: roomNo,
                join_date: joinDate,
                createdBy: createdByName,
            };

            await HostelRegistrationLog.create(regLogPayload);
            if (paid > 0) {
                await HostelPaymentLog.create({
                    hostelId,
                    memberId: createdMember.memberId,
                    memberName: createdMember.name,
                    amount: paid,
                    paymentType: "initial",
                    payment_date: joinDate,
                    createdBy: createdByName,
                });
            }

        } catch (error) {
            throw error; 
        }

        const saved = await HostelMember.findById(memberObjId).populate("planId", "name durationDays price").lean();

        return NextResponse.json(saved, { status: 201 });
    } catch (error: any) {
        console.error("[POST /api/hostel/members]", error);
        return NextResponse.json({ error: error?.message || "Server error" }, { status: 500 });
    }
}
