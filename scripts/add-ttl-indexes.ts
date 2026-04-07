// scripts/add-ttl-indexes.ts
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error("Please define the MONGODB_URI environment variable");
    process.exit(1);
}

const entryLogSchema = new mongoose.Schema({}, { strict: false });
const EntryLog = mongoose.models.EntryLog || mongoose.model("EntryLog", entryLogSchema);

const accessLogSchema = new mongoose.Schema({}, { strict: false });
const AccessLog = mongoose.models.AccessLog || mongoose.model("AccessLog", accessLogSchema);

const notificationLogSchema = new mongoose.Schema({}, { strict: false });
const NotificationLog = mongoose.models.NotificationLog || mongoose.model("NotificationLog", notificationLogSchema);

async function addTtlIndexes() {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI as string);
    console.log("Connected successfully.\n");

    try {
        console.log("TTL active: Adding TTL indexes...");
        
        // ── Helper: Safe TTL Create ──
        const safeTtlIndex = async (model: any, seconds: number, label: string) => {
            try {
                // Drop existing if options differ (prevents Conflict error)
                await model.collection.dropIndex("createdAt_1").catch(() => null); 
                await model.collection.createIndex(
                    { createdAt: 1 },
                    { expireAfterSeconds: seconds, background: true }
                );
                console.log(`✅ ${label} TTL active (${seconds}s).`);
            } catch (e: any) {
                console.warn(`⚠️ ${label} TTL warning:`, e.message);
            }
        };

        await safeTtlIndex(EntryLog, 7776000, "EntryLog (90d)");
        await safeTtlIndex(AccessLog, 2592000, "AccessLog (30d)");
        await safeTtlIndex(NotificationLog, 5184000, "NotificationLog (60d)");

        console.log("\n🚀 All background TTL creation jobs submitted successfully.");
    } catch (error) {
        console.warn("❌ Error creating TTL indexes. Warning only as per fallback mechanism:", error);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected from MongoDB.");
    }
}

addTtlIndexes().catch(console.error);
