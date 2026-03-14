import mongoose from "mongoose";
import * as fs from "fs";
import { Plan } from "../models/Plan";

async function main() {
    const envFile = fs.readFileSync(".env.local", "utf8");
    const mongoUriLine = envFile.split("\n").find((line) => line.startsWith("MONGODB_URI="));
    const MONGODB_URI = mongoUriLine ? mongoUriLine.split("=")[1].trim() : "";

    if (!MONGODB_URI) {
        console.error("Missing MONGODB_URI");
        process.exit(1);
    }

    await mongoose.connect(MONGODB_URI);

    const allPlans = await Plan.find({}).sort({ createdAt: 1 });
    const seenNames = new Set<string>();
    const toDelete = [];

    for (const plan of allPlans) {
        if (seenNames.has(plan.name)) {
            toDelete.push(plan._id);
        } else {
            seenNames.add(plan.name);
        }
    }

    if (toDelete.length > 0) {
        console.log(`Deleting ${toDelete.length} duplicate plans...`);
        await Plan.deleteMany({ _id: { $in: toDelete } });
        console.log("Deleted duplicates.");
    } else {
        console.log("No duplicate plans found.");
    }

    process.exit(0);
}

main().catch(console.error);
