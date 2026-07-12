import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { HostelMember } from "@/models/HostelMember";
import { HostelBlock } from "@/models/HostelBlock";
import { HostelFloor } from "@/models/HostelFloor";
import { HostelRoom } from "@/models/HostelRoom";
import { resolveUser, AuthUser } from "@/lib/authHelper";
export const dynamic = "force-dynamic";

/**
 * GET /api/hostel/rooms?block=A&floor=1
 * Returns room vacancy info for the given block/floor combination.
 */
export async function GET(req: Request) {
    try {
        const user = await resolveUser(req);
        await dbConnect();

        if (!user || user.role !== "hostel_admin") return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        const hostelId = user.hostelId as string;

        const url = new URL(req.url);
        const blockNo = url.searchParams.get("block") || "";
        const floorNo = url.searchParams.get("floor") || "";

        if (!blockNo || !floorNo) {
            return NextResponse.json({ rooms: [] }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        const block = await HostelBlock.findOne({ hostelId, name: blockNo }).lean() as any;
        if (!block) return NextResponse.json({ rooms: [] }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });

        const floor = await HostelFloor.findOne({ hostelId, blockId: block._id, floorNo }).lean() as any;
        if (!floor) return NextResponse.json({ rooms: [] }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });

        const rooms = await HostelRoom.find({ hostelId, floorId: floor._id }).lean();

        const roomIds = rooms.map(r => r._id);

        const occupancyCounts = await HostelMember.aggregate([
            { $match: { hostelId, roomId: { $in: roomIds }, status: "active", isDeleted: false } },
            { $group: { _id: "$roomId", count: { $sum: 1 }, occupiedBeds: { $push: "$bedNo" } } }
        ]);

        const occupancyMap = new Map(occupancyCounts.map(o => [o._id.toString(), { count: o.count, occupiedBeds: o.occupiedBeds }]));

        const roomsWithStatus = rooms.map((r: any) => {
            const occ = occupancyMap.get(r._id.toString()) || { count: 0, occupiedBeds: [] };
            const vac = (r.capacity || 1) - occ.count;
            
            // Auto-assign: Find the first available explicitly vacant bed slot 1 through capacity.
            let nextAvailableBed = null;
            if (vac > 0) {
                let availableBed = 1;
                while (occ.occupiedBeds.includes(availableBed) && availableBed <= (r.capacity || 1)) {
                    availableBed++;
                }
                if (availableBed <= (r.capacity || 1)) {
                    nextAvailableBed = availableBed;
                }
            }

            return {
                roomNo: r.roomNo,
                capacity: r.capacity || 1,
                isOccupied: vac <= 0,
                vacantCount: Math.max(0, vac),
                nextAvailableBed
            };
        });

        return NextResponse.json({ rooms: roomsWithStatus, block: blockNo, floor: floorNo }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    } catch (error) {
        console.error("[GET /api/hostel/rooms]", error);
        return NextResponse.json({ error: "Server error" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}
