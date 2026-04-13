import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { HostelSettings, getHostelSettings } from "@/models/HostelSettings";
import { Hostel } from "@/models/Hostel";
import { HostelBlock } from "@/models/HostelBlock";
import { HostelFloor } from "@/models/HostelFloor";
import { HostelRoom } from "@/models/HostelRoom";
import { HostelMember } from "@/models/HostelMember";
import { resolveUser, AuthUser } from "@/lib/authHelper";
export const dynamic = "force-dynamic";

// GET /api/hostel/hostel-settings — strict structure + occupancy mapping
export async function GET(req: Request) {
    try {
        const user = await resolveUser(req);
        await dbConnect();

        if (!user || user.role !== "hostel_admin") return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        const hostelId = user.hostelId as string;

        const [settings, hostel, dbBlocks, dbFloors, dbRooms, dbMembers] = await Promise.all([
            getHostelSettings(hostelId),
            Hostel.findOne({ hostelId }).select("numberOfBlocks hostelName").lean() as any,
            HostelBlock.find({ hostelId }).sort({ name: 1 }).lean(),
            HostelFloor.find({ hostelId }).sort({ floorNo: 1 }).lean(),
            HostelRoom.find({ hostelId }).sort({ roomNo: 1 }).lean(),
            HostelMember.find({ hostelId, isDeleted: false, isActive: true }).select("blockId floorId roomId bedNo").lean()
        ]);

        const blocks = dbBlocks.map((b: any) => {
            const bFloors = dbFloors.filter((f: any) => f.blockId.toString() === b._id.toString());
            let blockOccupiedBeds = 0;

            const floors = bFloors.map((f: any) => {
                const fRooms = dbRooms.filter((r: any) => r.floorId.toString() === f._id.toString());
                let floorOccupiedBeds = 0;

                const rooms = fRooms.map((r: any) => {
                    const roomOccupants = dbMembers.filter((m: any) => m.roomId && m.roomId.toString() === r._id.toString());
                    const occupiedBeds = roomOccupants.length;
                    floorOccupiedBeds += occupiedBeds;
                    return {
                        _id: r._id,
                        roomNo: r.roomNo,
                        capacity: r.capacity || 1,
                        occupiedBeds
                    };
                });

                blockOccupiedBeds += floorOccupiedBeds;

                return {
                    _id: f._id,
                    floorNo: f.floorNo,
                    occupiedBeds: floorOccupiedBeds,
                    rooms
                };
            });

            return {
                _id: b._id,
                name: b.name,
                occupiedBeds: blockOccupiedBeds,
                floors
            };
        });

        return NextResponse.json({
            whatsappEnabled: settings.whatsappEnabled,
            whatsappMessageTemplate: settings.whatsappMessageTemplate,
            blocks,
            maxBlocks: hostel?.numberOfBlocks ?? 4,
            hostelName: hostel?.hostelName,
        }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    } catch (error) {
        console.error("[GET /api/hostel/hostel-settings]", error);
        return NextResponse.json({ error: "Server error" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}

// PUT /api/hostel/hostel-settings — strict hierarchy validation & delta updation
export async function PUT(req: Request) {
    try {
        const user = await resolveUser(req);
        await dbConnect();
        const [body] = await Promise.all([req.json()]);
        await dbConnect();
        if (!user || user.role !== "hostel_admin") return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        const hostelId = user.hostelId as string;

        const { blocks, whatsappEnabled, whatsappMessageTemplate } = body;
        const incomingBlocks = Array.isArray(blocks) ? blocks : [];

        const hostel = await Hostel.findOne({ hostelId }).select("numberOfBlocks").lean() as any;
        const maxBlocks = hostel?.numberOfBlocks ?? 4;
        if (incomingBlocks.length > maxBlocks) {
            return NextResponse.json({ error: `Maximum ${maxBlocks} block(s) allowed.` }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        // Structural Limiter Check
        for (const block of incomingBlocks) {
            if ((block.floors || []).length > 8) return NextResponse.json({ error: `Block ${block.name} exceeds 8 floors.` }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
            for (const floor of block.floors || []) {
                if ((floor.rooms || []).length > 15) return NextResponse.json({ error: `Floor ${floor.floorNo} exceeds 15 rooms.` }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
                for (const room of floor.rooms || []) {
                    if (room.capacity > 6) return NextResponse.json({ error: `Room ${room.roomNo} exceeds 6 beds.` }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
                }
            }
        }

        const existingBlocks = await HostelBlock.find({ hostelId }).lean();
        const existingFloors = await HostelFloor.find({ hostelId }).lean();
        const existingRooms = await HostelRoom.find({ hostelId }).lean();

        // 1. Gather all Incoming IDs to diff against Database
        const incomingBlockIds = incomingBlocks.map((b: any) => b._id).filter(Boolean);
        const incomingFloorIds: string[] = [];
        const incomingRoomIds: string[] = [];
        incomingBlocks.forEach((b: any) => {
            (b.floors || []).forEach((f: any) => {
                if (f._id) incomingFloorIds.push(f._id);
                (f.rooms || []).forEach((r: any) => {
                    if (r._id) incomingRoomIds.push(r._id);
                });
            });
        });

        // 2. Compute the exact elements the UI wants to delete
        const blocksToDelete = existingBlocks.filter(eb => !incomingBlockIds.includes(eb._id.toString()));
        const floorsToDelete = existingFloors.filter(ef => !incomingFloorIds.includes(ef._id.toString()));
        const roomsToDelete = existingRooms.filter(er => !incomingRoomIds.includes(er._id.toString()));

        // ============================================
        // ATOMIC SAFE-DELETION VALIDATION
        // ============================================
        
        // Validation Rule 1: A Room can be deleted IF it has zero members
        for (const room of roomsToDelete) {
            const hasMembers = await HostelMember.exists({ roomId: room._id, isActive: true, isDeleted: false });
            if (hasMembers) {
                return NextResponse.json({ error: `Cannot delete: Room ${room.roomNo} has active members` }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
            }
        }

        // Validation Rule 2: A Floor can be deleted IF ALL rooms inside it are empty of members
        for (const floor of floorsToDelete) {
            const hasMembers = await HostelMember.exists({ floorId: floor._id, isActive: true, isDeleted: false });
            if (hasMembers) {
                return NextResponse.json({ error: `Cannot delete: Floor ${floor.floorNo} contains occupied rooms` }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
            }
        }

        // Validation Rule 3: A Block can be deleted IF NO members exist in that block
        for (const block of blocksToDelete) {
            const hasMembers = await HostelMember.exists({ blockId: block._id, isActive: true, isDeleted: false });
            if (hasMembers) {
                return NextResponse.json({ error: `Cannot delete: Block ${block.name} contains active members` }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
            }
        }

        // Validation Rule 4: Cannot reduce capacity of an existing room below a bed number that a member physically occupies
        for (const b of incomingBlocks) {
            for (const f of (b.floors || [])) {
                for (const r of (f.rooms || [])) {
                    if (r._id) {
                        const maxOccupiedBed = await HostelMember.findOne({ roomId: r._id, isActive: true, isDeleted: false })
                            .sort({ bedNo: -1 })
                            .select("bedNo")
                            .lean() as any;
                        if (maxOccupiedBed && maxOccupiedBed.bedNo > r.capacity) {
                            return NextResponse.json({ error: `Cannot diminish capacity of Room ${r.roomNo}. Bed ${maxOccupiedBed.bedNo} is currently occupied.` }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
                        }
                    }
                }
            }
        }

        // ============================================
        // DELTA EXECUTION (UPSERT/DELETE)
        // ============================================
        
        // Delete orphaned children permanently
        if (roomsToDelete.length > 0) await HostelRoom.deleteMany({ _id: { $in: roomsToDelete.map(r => r._id) } });
        if (floorsToDelete.length > 0) await HostelFloor.deleteMany({ _id: { $in: floorsToDelete.map(f => f._id) } });
        if (blocksToDelete.length > 0) await HostelBlock.deleteMany({ _id: { $in: blocksToDelete.map(b => b._id) } });

        // Update WhatsApp Settings
        await HostelSettings.findOneAndUpdate(
            { hostelId },
            { $set: { whatsappEnabled, whatsappMessageTemplate } },
            { returnDocument: 'after', upsert: true }
        );

        // Upsert logic for retained architecture
        for (const block of incomingBlocks) {
            let bDoc;
            if (block._id) {
                bDoc = await HostelBlock.findByIdAndUpdate(block._id, { name: block.name }, { returnDocument: 'after' });
            } else {
                bDoc = await HostelBlock.create({ hostelId, name: block.name });
            }

            for (const floor of (block.floors || [])) {
                let fDoc;
                if (floor._id) {
                    fDoc = await HostelFloor.findByIdAndUpdate(floor._id, { floorNo: floor.floorNo, blockId: bDoc!._id }, { returnDocument: 'after' });
                } else {
                    fDoc = await HostelFloor.create({ hostelId, blockId: bDoc!._id, floorNo: floor.floorNo });
                }

                for (const room of (floor.rooms || [])) {
                    if (room._id) {
                        await HostelRoom.findByIdAndUpdate(room._id, { 
                            roomNo: room.roomNo, 
                            capacity: room.capacity || 1,
                            blockId: bDoc!._id,
                            floorId: fDoc!._id
                        });
                    } else {
                        await HostelRoom.create({
                            hostelId,
                            blockId: bDoc!._id,
                            floorId: fDoc!._id,
                            roomNo: room.roomNo,
                            capacity: room.capacity || 1
                        });
                    }
                }
            }
        }

        return NextResponse.json({ success: true, message: "Settings saved safely." }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    } catch (error: any) {
        console.error("[PUT /api/hostel/hostel-settings]", error);
        return NextResponse.json({ error: error?.message || "Server error" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}
