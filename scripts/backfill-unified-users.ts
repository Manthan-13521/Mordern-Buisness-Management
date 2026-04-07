// @ts-nocheck
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

// Load environment variables safely
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

async function backfill() {
    console.log("Starting UnifiedUser backfill process...");
    
    // Safety check
    if (!process.env.MONGODB_URI) {
        console.error("MONGODB_URI explicitly required for script execution.");
        process.exit(1);
    }

    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB.");

        const { Member } = await import("@/models/Member");
        const { EntertainmentMember } = await import("@/models/EntertainmentMember");
        const { HostelMember } = await import("@/models/HostelMember");
        const { UnifiedUser } = await import("@/models/UnifiedUser");

        let totalUpserted = 0;
        let errors = 0;

        // ── Backfilling Pool Members ──
        console.log("Processing Pool Members...");
        const membersCursor = Member.find({}).cursor();
        let poolBatch = [];

        for await (const m of membersCursor) {
            poolBatch.push({
                updateOne: {
                    filter: { originalId: m._id.toString() },
                    update: {
                        $set: {
                            organizationId: m.organizationId || m.poolId,
                            name: m.name,
                            phone: m.phone,
                            type: "pool",
                            accessState: m.accessState || "active",
                            cachedBalance: m.cachedBalance || 0,
                        }
                    },
                    upsert: true
                }
            });

            if (poolBatch.length >= 500) {
                const res = await UnifiedUser.bulkWrite(poolBatch);
                totalUpserted += res.upsertedCount + res.modifiedCount;
                poolBatch = [];
            }
        }
        if (poolBatch.length > 0) {
            const res = await UnifiedUser.bulkWrite(poolBatch);
            totalUpserted += res.upsertedCount + res.modifiedCount;
        }

        // ── Backfilling Entertainment Members ──
        console.log("Processing Entertainment Members...");
        const entCursor = EntertainmentMember.find({}).cursor();
        let entBatch = [];

        for await (const m of entCursor) {
            entBatch.push({
                updateOne: {
                    filter: { originalId: m._id.toString() },
                    update: {
                        $set: {
                            organizationId: m.organizationId || m.poolId,
                            name: m.name,
                            phone: m.phone,
                            type: "entertainment",
                            accessState: m.accessState || "active",
                            cachedBalance: m.cachedBalance || 0,
                        }
                    },
                    upsert: true
                }
            });

            if (entBatch.length >= 500) {
                const res = await UnifiedUser.bulkWrite(entBatch);
                totalUpserted += res.upsertedCount + res.modifiedCount;
                entBatch = [];
            }
        }
        if (entBatch.length > 0) {
            const res = await UnifiedUser.bulkWrite(entBatch);
            totalUpserted += res.upsertedCount + res.modifiedCount;
        }

        // ── Backfilling Hostel Members ──
        console.log("Processing Hostel Members...");
        const hostelCursor = HostelMember.find({}).cursor();
        let hostelBatch = [];

        for await (const h of hostelCursor) {
            hostelBatch.push({
                updateOne: {
                    filter: { originalId: h._id.toString() },
                    update: {
                        $set: {
                            organizationId: h.hostelId,
                            name: h.name,
                            phone: h.phone,
                            type: "hostel",
                            accessState: (h.balance && h.balance > 0 && h.status === "active") ? "blocked" : "active",
                            cachedBalance: h.balance || 0,
                        }
                    },
                    upsert: true
                }
            });

            if (hostelBatch.length >= 500) {
                const res = await UnifiedUser.bulkWrite(hostelBatch);
                totalUpserted += res.upsertedCount + res.modifiedCount;
                hostelBatch = [];
            }
        }
        if (hostelBatch.length > 0) {
            const res = await UnifiedUser.bulkWrite(hostelBatch);
            totalUpserted += res.upsertedCount + res.modifiedCount;
        }

        console.log(`✅ Backfill complete. Filtered & unified ${totalUpserted} entities with ${errors} errors.`);

    } catch (error) {
        console.error("Backfill failed:", error);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected from MongoDB.");
        process.exit(0);
    }
}

backfill();
