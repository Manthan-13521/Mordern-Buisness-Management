import "dotenv/config";
import { dbConnect } from "../lib/mongodb";
import { Ad } from "../models/Ad";

async function run() {
    await dbConnect();
    
    console.log("Starting ad migration...");
    
    const ads = await Ad.collection.find({}).toArray();
    let migratedCount = 0;
    
    for (const ad of ads) {
        const updates: any = {};
        
        if (ad.placementSlot && (!ad.placementSlots || ad.placementSlots.length === 0)) {
            updates.placementSlots = [ad.placementSlot];
            updates.$unset = updates.$unset || {};
            updates.$unset.placementSlot = "";
        }
        
        if (ad.isActive !== undefined && !ad.status) {
            updates.status = ad.isActive ? "active" : "paused";
            updates.$unset = updates.$unset || {};
            updates.$unset.isActive = "";
        }

        if (!ad.slotAnalytics) {
            updates.slotAnalytics = [];
        }

        if (!ad.deliveryStrategy) {
            updates.deliveryStrategy = "single";
        }
        
        if (Object.keys(updates).length > 0) {
            const { $unset, ...setFields } = updates;
            const updateDoc: any = {};
            if (Object.keys(setFields).length > 0) updateDoc.$set = setFields;
            if ($unset && Object.keys($unset).length > 0) updateDoc.$unset = $unset;
            
            await Ad.collection.updateOne({ _id: ad._id }, updateDoc);
            migratedCount++;
        }
    }
    
    console.log(`Migration complete. Migrated ${migratedCount} ads.`);
    process.exit(0);
}

run().catch(console.error);
