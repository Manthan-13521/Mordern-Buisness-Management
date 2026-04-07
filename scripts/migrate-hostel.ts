import mongoose from "mongoose";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" }); // Load from .env.local

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI is not defined");
}

async function migrate() {
  await mongoose.connect(MONGODB_URI as string);
  console.log("Connected to DB");

  // We cannot easily import Next.js schemas dynamically in a raw TS script without
  // setting up module aliases and Next environment.
  // Instead, we define identical simple schemas just for migration.

  const HostelMemberSchema = new mongoose.Schema({
    hostelId: String,
    memberId: String,
    block_room_no: String,
    roomNo: String,
    blockId: mongoose.Schema.Types.ObjectId,
    floorId: mongoose.Schema.Types.ObjectId,
    roomId: mongoose.Schema.Types.ObjectId,
    bedNo: Number,
    name: String,
  }, { strict: false });

  const HostelBlockSchema = new mongoose.Schema({
    hostelId: String,
    name: String,
  });

  const HostelFloorSchema = new mongoose.Schema({
    hostelId: String,
    blockId: mongoose.Schema.Types.ObjectId,
    floorNo: String,
  });

  const HostelRoomSchema = new mongoose.Schema({
    hostelId: String,
    blockId: mongoose.Schema.Types.ObjectId,
    floorId: mongoose.Schema.Types.ObjectId,
    roomNo: String,
  });

  const Member = mongoose.models.HostelMember || mongoose.model("HostelMember", HostelMemberSchema);
  const Block = mongoose.models.HostelBlock || mongoose.model("HostelBlock", HostelBlockSchema);
  const Floor = mongoose.models.HostelFloor || mongoose.model("HostelFloor", HostelFloorSchema);
  const Room = mongoose.models.HostelRoom || mongoose.model("HostelRoom", HostelRoomSchema);

  const members = await Member.find({});
  console.log(`Found ${members.length} members.`);

  for (const m of members) {
    if (m.roomId) continue; // Already migrated

    // The user's image shows formats like "Manthan-101-1", "Block A-1-1", "A-101-3", "101"
    const brn = m.block_room_no || m.roomNo || "";
    
    // We can try to parse intelligently.
    // Parts split by '-'
    const parts = brn.split('-');
    
    let blockName = "";
    let roomStr = "";
    let bedStr = "";

    if (parts.length >= 3) {
      bedStr = parts.pop()!;
      roomStr = parts.pop()!;
      blockName = parts.join('-'); // "Block A" or "A" or "Manthan"
    } else if (parts.length === 2) {
      roomStr = parts[0];
      bedStr = parts[1];
    } else {
      roomStr = brn; // Just "101"
    }

    if (!roomStr) roomStr = m.roomNo || "";

    // Clean block name
    blockName = blockName.replace(/^Block\s+/i, '').trim();

    // If block name is still empty, let's just pick the first block for their hostel
    let block = null;
    if (blockName) {
         block = await Block.findOne({ hostelId: m.hostelId, name: new RegExp(blockName, 'i') });
         // Fallback if renaming already happened
         if (!block && blockName === 'A') block = await Block.findOne({ hostelId: m.hostelId, name: 'Manthan' });
    }

    if (!block) {
        block = await Block.findOne({ hostelId: m.hostelId });
    }

    if (!block) {
       console.log(`WARNING: No block found for hostel ${m.hostelId}. Skipping member ${m.memberId}`);
       continue;
    }

    // Now find floor based on roomStr (e.g. 101 -> Floor 1)
    let floorNoStr = "1";
    const match = roomStr.match(/\d+/);
    if (match) {
       const rNum = parseInt(match[0], 10);
       floorNoStr = String(Math.floor(rNum / 100));
       if (floorNoStr === "0" || isNaN(parseInt(floorNoStr))) floorNoStr = "1";
    }

    let floor = await Floor.findOne({ hostelId: m.hostelId, blockId: block._id, floorNo: floorNoStr });
    if (!floor) floor = await Floor.findOne({ hostelId: m.hostelId, blockId: block._id });

    if (!floor) {
       console.log(`WARNING: No floor found for member ${m.memberId}`);
       continue;
    }

    // formatted roomNo? DB stores it usually as "1" or "01" depending on how they created it.
    // The user's code did: roomNo in room was e.g. "1" instead of "101". Wait, actually the user said `A-101 (capacity 3)`.
    // Let's just find the room by scanning all rooms in that floor and checking if formatted matches.
    const allRooms = await Room.find({ hostelId: m.hostelId, floorId: floor._id });
    
    let targetRoom = null;
    for (const r of allRooms) {
        let fRoom = r.roomNo;
        const rMatch = String(r.roomNo).match(/\d+/);
        if (rMatch) {
            const rN = parseInt(rMatch[0], 10);
            const pad = String(rN % 100).padStart(2, '0');
            fRoom = `${floor.floorNo}${pad}`;
        }
        if (fRoom === roomStr || r.roomNo === roomStr) {
            targetRoom = r;
            break;
        }
    }

    if (!targetRoom && allRooms.length > 0) {
        targetRoom = allRooms[0];
    }

    if (!targetRoom) {
       console.log(`WARNING: No room found for member ${m.memberId} in floor ${floor.floorNo}.`);
       continue; // Can't migrate
    }

    m.blockId = block._id;
    m.floorId = floor._id;
    m.roomId = targetRoom._id;
    m.bedNo = parseInt(bedStr, 10) || 1;

    await m.save();
    console.log(`Migrated ${m.memberId} | ${brn} -> Block: ${block.name}, Room: ${targetRoom.roomNo}, Bed: ${m.bedNo}`);
  }

  console.log("Migration complete!");
  process.exit(0);
}

migrate().catch(console.error);
