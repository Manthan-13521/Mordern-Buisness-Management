import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import mongoose from "mongoose";
import { Hostel } from "../models/Hostel";
import { User } from "../models/User";
import { Organization } from "../models/Organization";
import { HostelSettings } from "../models/HostelSettings";

async function migrate() {
    try {
        if (!process.env.MONGODB_URI) {
            console.error("MONGODB_URI not found in environment");
            process.exit(1);
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB");

        // Find ALL hostels that don't start with HOS
        const hostels = await Hostel.find({ 
            hostelId: { $not: /^HOS/ }
        }); 
        console.log(`Found ${hostels.length} hostels to migrate`);

        for (let i = 0; i < hostels.length; i++) {
            const h = hostels[i];
            const oldId = h.hostelId;
            
            // Get last HOS ID to continue sequence
            const lastHostel = await Hostel.findOne({ hostelId: /^HOS/ }).sort({ hostelId: -1 });
            let nextNum = 1;
            if (lastHostel) {
                nextNum = parseInt(lastHostel.hostelId.replace("HOS", "")) + 1;
            }
            
            const newId = `HOS${nextNum.toString().padStart(3, "0")}`;

            console.log(`Migrating ${oldId} -> ${newId}`);

            // Update Hostel
            await Hostel.updateOne({ _id: h._id }, { $set: { hostelId: newId } });

            // Update Users
            await User.updateMany({ hostelId: oldId }, { $set: { hostelId: newId } });

            // Update Organizations
            await Organization.updateMany({ hostelIds: oldId }, { $set: { "hostelIds.$": newId } });

            // Update HostelSettings
            await HostelSettings.updateMany({ hostelId: oldId }, { $set: { hostelId: newId } });
        }

        console.log("Migration complete");
        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
}

migrate();
