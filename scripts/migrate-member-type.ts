/**
 * ═══════════════════════════════════════════════════════════════════════
 *  memberType Migration Script
 *  Adds `memberType` field to all existing Member documents
 *  Safe to re-run (idempotent), processes in batches of 500
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * Usage:
 *   npx tsx scripts/migrate-member-type.ts
 * 
 * This script:
 *   1. Connects to MongoDB using the same connection string as the app
 *   2. Scans all Member documents missing `memberType`
 *   3. Sets memberType = "regular" for M-prefix, "entertainment" for MS-prefix
 *   4. Uses bulkWrite in batches of 500 to avoid memory issues
 *   5. Is fully idempotent — safe to re-run
 */

import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
    console.error("MONGODB_URI not set");
    process.exit(1);
}

const BATCH_SIZE = 500;

async function migrate() {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI!, {
        maxPoolSize: 5,
        serverSelectionTimeoutMS: 10000,
    });
    console.log("Connected.");

    const db = mongoose.connection.db;
    if (!db) {
        console.error("No database connection");
        process.exit(1);
    }
    const collection = db.collection("members");

    // Count documents missing memberType
    const totalMissing = await collection.countDocuments({
        memberType: { $exists: false }
    });
    console.log(`Found ${totalMissing} documents missing memberType`);

    if (totalMissing === 0) {
        console.log("Migration already complete. Nothing to do.");
        await mongoose.disconnect();
        return;
    }

    let processed = 0;
    let cursor = collection.find(
        { memberType: { $exists: false } },
        { projection: { _id: 1, memberId: 1 } }
    ).batchSize(BATCH_SIZE);

    let batch: any[] = [];

    for await (const doc of cursor) {
        const isEntertainment = typeof doc.memberId === "string" && doc.memberId.startsWith("MS");
        
        batch.push({
            updateOne: {
                filter: { _id: doc._id },
                update: { $set: { memberType: isEntertainment ? "entertainment" : "regular" } },
            }
        });

        if (batch.length >= BATCH_SIZE) {
            const result = await collection.bulkWrite(batch, { ordered: false });
            processed += result.modifiedCount;
            console.log(`Processed ${processed}/${totalMissing} (${Math.round(processed / totalMissing * 100)}%)`);
            batch = [];
        }
    }

    // Flush remaining batch
    if (batch.length > 0) {
        const result = await collection.bulkWrite(batch, { ordered: false });
        processed += result.modifiedCount;
        console.log(`Processed ${processed}/${totalMissing} (100%)`);
    }

    // Also do the same for entertainment_members collection
    const entCollection = db.collection("entertainment_members");
    const entMissing = await entCollection.countDocuments({
        memberType: { $exists: false }
    });

    if (entMissing > 0) {
        console.log(`\nMigrating ${entMissing} entertainment_members...`);
        await entCollection.updateMany(
            { memberType: { $exists: false } },
            { $set: { memberType: "entertainment" } }
        );
        console.log("Entertainment members migration complete.");
    }

    // Create index on memberType for both collections
    console.log("\nCreating memberType index...");
    await collection.createIndex({ memberType: 1 }, { background: true });
    await entCollection.createIndex({ memberType: 1 }, { background: true });
    console.log("Index created.");

    console.log(`\n✅ Migration complete. ${processed + entMissing} documents updated.`);
    await mongoose.disconnect();
}

migrate().catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
});
