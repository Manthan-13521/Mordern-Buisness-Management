import mongoose from "mongoose";
import dotenv from "dotenv";

import { Payment } from "../models/Payment.js";
import { Member } from "../models/Member.js";
import { EntertainmentMember } from "../models/EntertainmentMember.js";
import { HostelMember } from "../models/HostelMember.js";
import { HostelPayment } from "../models/HostelPayment.js";
import { HostelLog } from "../models/HostelLog.js";
import { HostelPaymentLog } from "../models/HostelPaymentLog.js";

dotenv.config({ path: ".env.local" });

const URI = process.env.MONGODB_URI;

if (!URI) {
    console.error("Missing MONGODB_URI");
    process.exit(1);
}

const buildIndexes = async () => {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(URI);
        console.log("Connected. Triggering createIndexes on all models safely in background mode...");

        // Ensure these models push their schema indexes natively
        await Promise.all([
            Payment.createIndexes(),
            Member.createIndexes(),
            EntertainmentMember.createIndexes(),
            HostelMember.createIndexes(),
            HostelPayment.createIndexes(),
            HostelLog.createIndexes(),
            HostelPaymentLog.createIndexes()
        ]);

        console.log("✅ All required composite indexes successfully built globally!");
    } catch (e) {
        console.error("Index building failed:", e);
    } finally {
        mongoose.connection.close();
        process.exit(0);
    }
};

buildIndexes();
