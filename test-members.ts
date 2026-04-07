import { dbConnect } from "./lib/mongodb";
import { HostelMember } from "./models/HostelMember";

async function main() {
  await dbConnect();
  const m = await HostelMember.find({ block_room_no: { $exists: true } }).select("roomNo block_room_no").lean();
  console.log(JSON.stringify(m, null, 2));
  process.exit(0);
}
main();
