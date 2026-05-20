/**
 * Audit script: Find hostels where Hostel.numberOfBlocks > User.subscription.blocks
 * 
 * Usage: npx tsx scripts/audit-hostel-blocks.ts
 * 
 * This is a DRY-RUN script — it reports mismatches but does NOT delete or modify data.
 * Output: JSON report of all mismatched hostels for manual review.
 */

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error("❌ MONGODB_URI not found in .env.local");
        process.exit(1);
    }

    console.log("🔗 Connecting to MongoDB...");
    await mongoose.connect(uri);
    console.log("✅ Connected.\n");

    // Import models after connection
    const { Hostel } = await import("../models/Hostel");
    const { User } = await import("../models/User");
    const { HostelBlock } = await import("../models/HostelBlock");

    const hostels = await Hostel.find({}).lean();
    console.log(`📊 Found ${hostels.length} hostels. Scanning for block mismatches...\n`);

    const mismatches: Array<{
        hostelId: string;
        hostelName: string;
        hostelModelBlocks: number;
        userSubscriptionBlocks: number | null;
        actualBlocksInDb: number;
        adminEmail: string;
        status: string;
    }> = [];

    for (const hostel of hostels) {
        const h = hostel as any;
        
        // Find the hostel admin user
        const admin = await User.findOne({ 
            hostelId: h.hostelId, 
            role: "hostel_admin" 
        }).select("subscription email").lean() as any;

        if (!admin) {
            console.log(`⚠️  ${h.hostelId} (${h.hostelName}): No admin user found — skipping`);
            continue;
        }

        const hostelModelBlocks = h.numberOfBlocks || 1;
        const userSubBlocks = admin.subscription?.blocks ?? null;
        const actualBlocks = await HostelBlock.countDocuments({ hostelId: h.hostelId });

        // Mismatch conditions:
        // 1. Hostel model says more blocks than subscription allows
        // 2. Actual blocks in DB exceed subscription entitlement
        const hasMismatch = (
            (userSubBlocks !== null && hostelModelBlocks > userSubBlocks) ||
            (userSubBlocks !== null && actualBlocks > userSubBlocks)
        );

        if (hasMismatch) {
            mismatches.push({
                hostelId: h.hostelId,
                hostelName: h.hostelName,
                hostelModelBlocks,
                userSubscriptionBlocks: userSubBlocks,
                actualBlocksInDb: actualBlocks,
                adminEmail: admin.email,
                status: h.subscriptionStatus,
            });
            console.log(`🔴 MISMATCH: ${h.hostelId} "${h.hostelName}"`);
            console.log(`   Hostel.numberOfBlocks = ${hostelModelBlocks}`);
            console.log(`   User.subscription.blocks = ${userSubBlocks}`);
            console.log(`   Actual HostelBlock docs = ${actualBlocks}`);
            console.log(`   Admin: ${admin.email}\n`);
        } else {
            console.log(`✅ ${h.hostelId} "${h.hostelName}": OK (model=${hostelModelBlocks}, sub=${userSubBlocks ?? "none"}, actual=${actualBlocks})`);
        }
    }

    console.log("\n" + "═".repeat(60));
    console.log(`\n📋 AUDIT SUMMARY`);
    console.log(`   Total hostels scanned: ${hostels.length}`);
    console.log(`   Mismatches found: ${mismatches.length}`);

    if (mismatches.length > 0) {
        console.log(`\n⚠️  The following hostels have over-entitled block counts.`);
        console.log(`   NO DATA HAS BEEN MODIFIED — manual review required.\n`);
        console.log(JSON.stringify(mismatches, null, 2));
    } else {
        console.log(`\n✅ No mismatches found. All hostels are correctly entitled.`);
    }

    await mongoose.disconnect();
    console.log("\n🔗 Disconnected from MongoDB.");
}

main().catch(err => {
    console.error("Fatal error:", err);
    process.exit(1);
});
