#!/usr/bin/env ts-node
/**
 * scripts/fix-orphans.ts
 * ─────────────────────────────────────────────────────────────────────────
 * One-time data-fix script: finds and removes orphan Member/EntertainmentMember
 * documents that are missing a poolId (or have poolId = null/empty).
 *
 * USAGE:
 *   # Dry run (inspect only — no changes):
 *   npx ts-node scripts/fix-orphans.ts --dry-run
 *
 *   # Live run (hard-deletes orphans):
 *   npx ts-node scripts/fix-orphans.ts
 *
 *   # Live run with soft-delete instead of hard-delete:
 *   npx ts-node scripts/fix-orphans.ts --soft
 *
 * ─────────────────────────────────────────────────────────────────────────
 */

import mongoose from "mongoose";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
    console.error("❌  MONGODB_URI not set in .env.local");
    process.exit(1);
}

const isDryRun = process.argv.includes("--dry-run");
const isSoft   = process.argv.includes("--soft");

// ── Orphan filter ─────────────────────────────────────────────────────────
const orphanFilter = {
    $or: [
        { poolId: { $exists: false } },
        { poolId: null },
        { poolId: "" },
    ],
};

async function run() {
    console.log("🔌  Connecting to MongoDB…");
    await mongoose.connect(MONGODB_URI as string);
    console.log("✅  Connected.\n");

    const db = mongoose.connection.db!;

    for (const collectionName of ["members", "entertainment_members"]) {
        const collection = db.collection(collectionName);

        // Count orphans
        const count = await collection.countDocuments(orphanFilter);
        console.log(`📋  [${collectionName}] Orphan records found: ${count}`);

        if (count === 0) continue;

        // Show sample
        const sample = await collection.find(orphanFilter).limit(5).toArray();
        console.log(`   Sample IDs: ${sample.map(d => d._id).join(", ")}`);

        if (isDryRun) {
            console.log(`   ⏩  Dry run — skipping deletion.\n`);
            continue;
        }

        if (isSoft) {
            // Soft-delete: mark isDeleted = true, set deletedAt
            const result = await collection.updateMany(orphanFilter, {
                $set: {
                    isDeleted: true,
                    deletedAt: new Date(),
                    deleteReason: "auto_standard",
                    status: "deleted",
                },
            });
            console.log(`   🗂️  Soft-deleted ${result.modifiedCount} orphan records.\n`);
        } else {
            // Hard-delete
            const result = await collection.deleteMany(orphanFilter);
            console.log(`   🗑️  Hard-deleted ${result.deletedCount} orphan records.\n`);
        }
    }

    // ── Also check payments orphans ─────────────────────────────────────
    const paymentsCollection = db.collection("payments");
    const paymentOrphans = await paymentsCollection.countDocuments(orphanFilter);
    console.log(`📋  [payments] Orphan records found: ${paymentOrphans}`);
    if (paymentOrphans > 0 && !isDryRun) {
        const result = await paymentsCollection.deleteMany(orphanFilter);
        console.log(`   🗑️  Hard-deleted ${result.deletedCount} orphan payment records.\n`);
    } else if (paymentOrphans > 0) {
        console.log(`   ⏩  Dry run — skipping deletion.\n`);
    }

    // ── Also check notification_logs orphans ────────────────────────────
    const notifCollection = db.collection("notificationlogs");
    const notifOrphans = await notifCollection.countDocuments(orphanFilter);
    console.log(`📋  [notificationlogs] Orphan records found: ${notifOrphans}`);
    if (notifOrphans > 0 && !isDryRun) {
        const result = await notifCollection.deleteMany(orphanFilter);
        console.log(`   🗑️  Hard-deleted ${result.deletedCount} orphan notification log records.\n`);
    } else if (notifOrphans > 0) {
        console.log(`   ⏩  Dry run — skipping deletion.\n`);
    }

    await mongoose.disconnect();
    console.log("🏁  Done. Disconnected from MongoDB.");
}

run().catch((err) => {
    console.error("❌  Script failed:", err);
    process.exit(1);
});
