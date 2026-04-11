import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { getToken } from "next-auth/jwt";
import { HostelBlock } from "@/models/HostelBlock";
import { HostelFloor } from "@/models/HostelFloor";
import { HostelRoom } from "@/models/HostelRoom";
import { HostelMember } from "@/models/HostelMember";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    try {
        const [token] = await Promise.all([getToken({ req: req as any }), dbConnect()]);
        if (!token || token.role !== "hostel_admin") {
            return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }
        const hostelId = token.hostelId as string;
        if (!hostelId) return NextResponse.json({ error: "Forbidden" }, {  status: 403 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });

        // Fetch structure perfectly linearly, then map
        const [blocks, floors, rooms, members] = await Promise.all([
            HostelBlock.find({ hostelId }).sort({ name: 1 }).lean(),
            HostelFloor.find({ hostelId }).sort({ floorNo: 1 }).lean(),
            HostelRoom.find({ hostelId }).sort({ roomNo: 1 }).lean(),
            HostelMember.find({ hostelId, isDeleted: false, isActive: true })
                .populate("planId", "name durationDays price")
                .lean()
        ]);

        const mappedBlocks = blocks.map((b: any) => {
            const blockFloors = floors.filter((f: any) => f.blockId.toString() === b._id.toString());
            let blockTotalRooms = 0;
            let blockTotalBeds = 0;
            let blockOccupiedBeds = 0;

            const mappedFloors = blockFloors.map((f: any) => {
                const floorRooms = rooms.filter((r: any) => r.floorId.toString() === f._id.toString());
                let floorTotalRooms = floorRooms.length;
                let floorTotalBeds = 0;
                let floorOccupiedBeds = 0;

                const mappedRooms = floorRooms.map((r: any) => {
                    const roomCapacity = r.capacity || 1;
                    floorTotalBeds += roomCapacity;
                    blockTotalBeds += roomCapacity;
                    
                    const roomMembers = members.filter((m: any) => m.roomId.toString() === r._id.toString());
                    const roomOccupied = roomMembers.length;
                    
                    floorOccupiedBeds += roomOccupied;
                    blockOccupiedBeds += roomOccupied;

                    // Extrapolate beds array implicitly
                    const beds = [];
                    for (let i = 1; i <= roomCapacity; i++) {
                        const occupant = roomMembers.find((m: any) => m.bedNo === i);
                        if (occupant) {
                            beds.push({
                                bedNo: i,
                                isOccupied: true,
                                member: occupant,
                            });
                        } else {
                            beds.push({
                                bedNo: i,
                                isOccupied: false,
                                member: null,
                            });
                        }
                    }

                    return {
                        _id: r._id,
                        roomNo: r.roomNo,
                        capacity: roomCapacity,
                        occupiedBeds: roomOccupied,
                        vacantBeds: roomCapacity - roomOccupied,
                        beds,
                    };
                });

                blockTotalRooms += floorTotalRooms;

                return {
                    _id: f._id,
                    floorNo: f.floorNo,
                    roomsCount: floorTotalRooms,
                    bedsCount: floorTotalBeds,
                    occupiedBeds: floorOccupiedBeds,
                    vacantBeds: floorTotalBeds - floorOccupiedBeds,
                    rooms: mappedRooms,
                };
            });

            // Sort floors numerically usually but we will send them as is (already sorted by floorNo)
            // Wait, we should sort mappedFloors by floorNo
            mappedFloors.sort((a, b) => {
                const aNum = parseInt(a.floorNo);
                const bNum = parseInt(b.floorNo);
                return (isNaN(aNum) ? 0 : aNum) - (isNaN(bNum) ? 0 : bNum);
            });

            return {
                _id: b._id,
                name: b.name,
                totalRooms: blockTotalRooms,
                totalBeds: blockTotalBeds,
                occupiedBeds: blockOccupiedBeds,
                vacantBeds: blockTotalBeds - blockOccupiedBeds,
                floors: mappedFloors,
            };
        });

        return NextResponse.json({ success: true, data: mappedBlocks }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });

    } catch (error) {
        console.error("[GET /api/hostel/structure]", error);
        return NextResponse.json({ error: "Failed to fetch structure" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}
