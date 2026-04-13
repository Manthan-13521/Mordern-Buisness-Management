import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { getToken } from "next-auth/jwt";
import { jwtVerify } from "jose";
import { HostelMember } from "@/models/HostelMember";
import { HostelPayment } from "@/models/HostelPayment";
import { HostelLog } from "@/models/HostelLog";
import { HostelBlock } from "@/models/HostelBlock";
import { HostelFloor } from "@/models/HostelFloor";
import { HostelRoom } from "@/models/HostelRoom";
import { HostelPlan } from "@/models/HostelPlan";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

// GET /api/hostel/members/[id]
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
                const authHeader = req.headers.get("authorization");
        let token = null;

        if (authHeader?.startsWith("Bearer ")) {
            try {
                const bearerToken = authHeader.split(" ")[1];
                const secret = new TextEncoder().encode(process.env.JWT_SECRET);
                const { payload } = await jwtVerify(bearerToken, secret);
                token = payload;
            } catch (e) {}
        }

        if (!token) {
            token = await getToken({ req: req as any });
        }

        await dbConnect();
        const [{ id }] = await Promise.all([params]);
        await dbConnect();
        if (!token || token.role !== "hostel_admin") return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        const hostelId = token.hostelId as string;
        const member = await HostelMember.findOne({ _id: id, hostelId })
            .populate("planId", "name durationDays price")
            .populate("roomId", "roomNo capacity")
            .populate("blockId", "name")
            .lean() as any;
            
        if (!member) return NextResponse.json({ error: "Member not found" }, {  status: 404 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        
        let brn = member.block_room_no || "";
        let rNo = member.roomNo || "";
        if (member.blockId && member.roomId) {
            brn = `${member.blockId.name}-${member.roomId.roomNo}-${member.bedNo}`;
            rNo = member.roomId.roomNo;
        }
        member.block_room_no = brn;
        member.roomNo = rNo;

        // Fetch payments too
        const payments = await HostelPayment.find({ hostelId, memberId: new mongoose.Types.ObjectId(id) }).sort({ createdAt: -1 }).lean();
        return NextResponse.json({ ...member, payments }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    } catch (error) {
        console.error("[GET /api/hostel/members/[id]]", error);
        return NextResponse.json({ error: "Server error" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}

// PUT /api/hostel/members/[id]
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
                const authHeader = req.headers.get("authorization");
        let token = null;

        if (authHeader?.startsWith("Bearer ")) {
            try {
                const bearerToken = authHeader.split(" ")[1];
                const secret = new TextEncoder().encode(process.env.JWT_SECRET);
                const { payload } = await jwtVerify(bearerToken, secret);
                token = payload;
            } catch (e) {}
        }

        if (!token) {
            token = await getToken({ req: req as any });
        }

        await dbConnect();
        const [{ id }, body] = await Promise.all([params, req.json()]);
        await dbConnect();
        if (!token || token.role !== "hostel_admin") return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        const hostelId = token.hostelId as string;
        const { name, phone, collegeName, notes, blockNo, roomNo, floorNo } = body;
        
        let updateData: any = { name, phone, collegeName, notes };
        
        // If room changed, handle new room assignment logic
        if (roomNo && blockNo && floorNo) {
            const blockObj = await HostelBlock.findOne({ hostelId, name: blockNo }).lean() as any;
            if (!blockObj) return NextResponse.json({ error: "Block not found" }, {  status: 404 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
            
            const floorObj = await HostelFloor.findOne({ hostelId, blockId: blockObj._id, floorNo }).lean() as any;
            if (!floorObj) return NextResponse.json({ error: "Floor not found" }, {  status: 404 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
            
            const roomObj = await HostelRoom.findOne({ hostelId, floorId: floorObj._id, roomNo }).lean() as any;
            if (!roomObj) return NextResponse.json({ error: "Room not found" }, {  status: 404 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });

            // Check if user is actually moving rooms
            const oldMem = await HostelMember.findOne({ _id: id, hostelId }).lean() as any;
            if (oldMem && oldMem.roomId?.toString() !== roomObj._id.toString()) {
                const existingMembers = await HostelMember.find({ hostelId, roomId: roomObj._id }).select("bedNo").lean();
                let maxBed = 0;
                existingMembers.forEach((m: any) => {
                    if (m.bedNo && m.bedNo > maxBed) maxBed = m.bedNo;
                });
                
                updateData.roomId = roomObj._id;
                updateData.blockId = blockObj._id;
                updateData.floorId = floorObj._id;
                updateData.bedNo = maxBed + 1;
            }
        }

        const member = await HostelMember.findOneAndUpdate(
            { _id: id, hostelId },
            { $set: updateData },
            { returnDocument: 'after' }
        ).populate("planId", "name durationDays price").lean();
        if (!member) return NextResponse.json({ error: "Member not found" }, {  status: 404 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        return NextResponse.json(member, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    } catch (error) {
        console.error("[PUT /api/hostel/members/[id]]", error);
        return NextResponse.json({ error: "Server error" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}

// DELETE /api/hostel/members/[id]
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
                const authHeader = req.headers.get("authorization");
        let token = null;

        if (authHeader?.startsWith("Bearer ")) {
            try {
                const bearerToken = authHeader.split(" ")[1];
                const secret = new TextEncoder().encode(process.env.JWT_SECRET);
                const { payload } = await jwtVerify(bearerToken, secret);
                token = payload;
            } catch (e) {}
        }

        if (!token) {
            token = await getToken({ req: req as any });
        }

        await dbConnect();
        const [{ id }] = await Promise.all([params]);
        await dbConnect();
        if (!token || token.role !== "hostel_admin") return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        const hostelId = token.hostelId as string;
        const member = await HostelMember.findOne({ _id: id, hostelId }).lean() as any;
        if (!member) return NextResponse.json({ error: "Member not found" }, {  status: 404 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });

        // 1. Archive before hard deleting
        const { DeletedHostelMember } = await import("@/models/DeletedHostelMember");
        await DeletedHostelMember.create({
            memberId: member.memberId,
            hostelId: member.hostelId,
            name: member.name,
            phone: member.phone || "",
            join_date: member.join_date || member.createdAt,
            vacated_at: member.vacated_at,
            deletedAt: new Date(),
            originalDoc: member,
        });

        // 2. Hard-delete from active collection
        await HostelMember.deleteOne({ _id: id, hostelId });

        // 3. Audit Logging
        await HostelLog.create({
            hostelId,
            type: "manual_delete",
            memberId: member.memberId,
            memberObjectId: member._id,
            memberName: member.name,
            description: `Manual hard-delete performed. Member ${member.name} (${member.memberId}) archived to permanent storage.`,
            performedBy: token.email as string,
        });
        return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    } catch (error) {
        console.error("[DELETE /api/hostel/members/[id]]", error);
        return NextResponse.json({ error: "Server error" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}
