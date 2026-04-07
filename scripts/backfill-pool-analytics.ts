import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

// Dummy imports to ensure schemas are registered
import { Payment } from "../models/Payment";
import { Member } from "../models/Member";
import { EntertainmentMember } from "../models/EntertainmentMember";
import { PoolAnalytics } from "../models/PoolAnalytics";

async function run() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        throw new Error("MONGODB_URI is missing");
    }
    
    console.log("Connecting to MongoDB...");
    await mongoose.connect(uri);
    console.log("Connected.");
    
    // Clear the existing analytics collection
    console.log("Clearing existing PoolAnalytics...");
    await PoolAnalytics.deleteMany({});
    
    console.log("Aggregating Pool Members...");
    
    // Process Members
    const members = await Member.find({}, "poolId createdAt").lean();
    console.log(`Found ${members.length} regular members.`);

    const entMembers = await EntertainmentMember.find({}, "poolId createdAt").lean();
    console.log(`Found ${entMembers.length} entertainment members.`);

    const memberMap = new Map<string, number>();

    const processMemberContext = (items: any[]) => {
        for (const item of items) {
            if (!item.poolId || !item.createdAt) continue;
            
            const d = new Date(item.createdAt);
            const yyyyMm = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            const key = `${item.poolId}::${yyyyMm}`;
            
            memberMap.set(key, (memberMap.get(key) || 0) + 1);
        }
    };

    processMemberContext(members);
    processMemberContext(entMembers);

    console.log("Aggregating Pool Payments...");
    
    // Process Payments
    const payments = await Payment.find({ status: "success" }, "poolId date amount").lean();
    console.log(`Found ${payments.length} successful payments.`);

    const incomeMap = new Map<string, number>();

    for (const p of payments) {
        if (!p.poolId || !p.date) continue;

        const d = new Date(p.date as any);
        const yyyyMm = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const key = `${p.poolId}::${yyyyMm}`;

        incomeMap.set(key, (incomeMap.get(key) || 0) + (p.amount || 0));
    }

    console.log("Generating Ledger Entries...");
    // Combine both sets into the final analytics collection
    const keys = new Set([...memberMap.keys(), ...incomeMap.keys()]);

    const bulkOps = [];
    for (const key of keys) {
        const [poolId, yearMonth] = key.split("::");
        const newMembers = memberMap.get(key) || 0;
        const totalIncome = incomeMap.get(key) || 0;

        bulkOps.push({
            updateOne: {
                filter: { poolId, yearMonth },
                update: { $set: { newMembers, totalIncome } },
                upsert: true
            }
        });
    }

    if (bulkOps.length > 0) {
        console.log(`Running ${bulkOps.length} bulk upsert operations...`);
        const res = await PoolAnalytics.bulkWrite(bulkOps);
        console.log("Bulk write complete. Result:", res.upsertedCount, "upserted,", res.modifiedCount, "modified.");
    } else {
        console.log("No data found to backfill.");
    }

    console.log("Finished successfully.");
    process.exit(0);
}

run().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});
