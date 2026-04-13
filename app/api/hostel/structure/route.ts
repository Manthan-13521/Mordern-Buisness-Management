import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { getToken } from "@/lib/universalAuth";
import { HostelBlock } from "@/models/HostelBlock";
import { HostelMember } from "@/models/HostelMember";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    try {
        const [token] = await Promise.all([getToken({ req: req as any }), dbConnect()]);
        if (!token || token.role !== "hostel_admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const hostelId = token.hostelId as string;
        if (!hostelId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        // Phase 1: Native DB Aggregation matching user's hyper-optimized lookup pipeline
        const structuredBlocks = await HostelBlock.aggregate([
            { $match: { hostelId } },
            {
                $lookup: {
                    from: "hostelfloors",
                    localField: "_id",
                    foreignField: "blockId",
                    as: "floors"
                }
            },
            {
                $lookup: {
                    from: "hostelrooms",
                    localField: "floors._id",
                    foreignField: "floorId",
                    as: "rooms"
                }
            }
        ]);

        // Phase 2: Members are still flat for ultra fast ID matching
        const members = await HostelMember.find({ hostelId, isDeleted: false, status: { $in: ["active", "defaulter"] } })
            .select("roomId bedNo name phone photoUrl checkInDate due_date balance")
            .lean();

        // Phase 3: Final state restructuring directly mimicking the prior UI output but utilizing the pre-indexed aggregate output
        const mappedBlocks = structuredBlocks.map((b: any) => {
            let blockTotalRooms = 0;
            let blockTotalBeds = 0;
            let blockOccupiedBeds = 0;

            const mappedFloors = b.floors.map((f: any) => {
                // Room linking native to this floor
                const floorRooms = b.rooms.filter((r: any) => r.floorId && r.floorId.toString() === f._id.toString());
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

                    const beds = [];
                    for (let i = 1; i <= roomCapacity; i++) {
                        const occupant = roomMembers.find((m: any) => m.bedNo === i);
                        beds.push({
                            bedNo: i,
                            isOccupied: !!occupant,
                            member: occupant || null,
                        });
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

            mappedFloors.sort((a: any, b: any) => parseInt(a.floorNo) - parseInt(b.floorNo));

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

        // Ensure blocks are naturally sorted
        mappedBlocks.sort((a, b) => a.name.localeCompare(b.name));

        return NextResponse.json({ success: true, data: mappedBlocks }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });

    } catch (error) {
        console.error("[GET /api/hostel/structure]", error);
        return NextResponse.json({ error: "Failed to build optimized structure" }, { status: 500 });
    }
}
