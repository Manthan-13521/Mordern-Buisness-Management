import { dbConnect } from './lib/mongodb';
import { Member } from './models/Member';
import { DeletedMember } from './models/DeletedMember';
import { secureFindById } from './lib/tenantSecurity';

async function test() {
    await dbConnect();
    
    // Pick a member from 2026
    const member = await Member.findOne({ 
        poolId: { $ne: null },
        createdAt: { $gte: new Date(2026, 0, 1) }
    }).lean();

    if (!member) {
        console.log("No 2026 members found to test with.");
        return process.exit(0);
    }

    const poolId = member.poolId.toString();
    console.log("Testing with Member:", member._id, "from pool:", poolId);

    // 1. Get before counts
    const yearCreatedFilter = { $gte: new Date(2026, 0, 1), $lte: new Date(2026, 11, 31, 23, 59, 59, 999) };
    const getCounts = async () => {
        const mems = await Member.countDocuments({ poolId, createdAt: yearCreatedFilter });
        const dels = await DeletedMember.countDocuments({ poolId, "fullData.createdAt": yearCreatedFilter });
        return { mems, dels, total: mems + dels };
    };

    console.log("BEFORE:", await getCounts());

    // 2. Perform exactly what app/api/members/[id]/route.ts does:
    const Model = Member;
    
    try {
        await DeletedMember.create({
            originalId: member._id,
            memberId: member.memberId || member._id.toString(),
            name: member.name || "Unknown",
            phone: member.phone || "Unknown",
            poolId: member.poolId?.toString() || "unknown",
            deletedAt: new Date(),
            deletionType: "manual",
            collectionSource: "members",
            fullData: member,
        });
    } catch (archiveErr) {
        console.warn("DeletedMember archive failed (non-critical):", archiveErr);
    }

    // 4. Hard delete (what secureDeleteById effectively does)
    await Model.deleteOne({ _id: member._id });
    
    console.log("AFTER:", await getCounts());

    // Restore
    await Model.create(member);
    await DeletedMember.deleteOne({ originalId: member._id });
    console.log("Restored.");

    process.exit(0);
}
test();
