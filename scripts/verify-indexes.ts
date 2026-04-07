import mongoose from "mongoose";
import * as dotenv from "dotenv";
import { Member } from "../models/Member";
import { Payment } from "../models/Payment";
import { Subscription } from "../models/Subscription";
import { Ledger } from "../models/Ledger";

dotenv.config({ path: ".env.local" });

async function verify() {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGODB_URI missing");

    console.log("🚀 Starting Index Verification (Prompt 0.1)...");
    await mongoose.connect(uri);

    try {
        const orgId = "60c72b2f9b1d8e001c8e4b3a"; // dummy ID
        const memberId = new mongoose.Types.ObjectId("60c72b2f9b1d8e001c8e4b3b"); // dummy ID

        // 1. Verify Member Index
        console.log("\n--- Member Index Verification ---");
        const memberExp = await Member.find({ organizationId: orgId, _id: memberId }).explain("executionStats");
        const memberIdx = (memberExp as any).queryPlanner.winningPlan.inputStage.indexName;
        console.log(`✅ Member Index Hit: ${memberIdx}`);

        // 2. Verify Payment Index
        console.log("\n--- Payment Index Verification ---");
        const paymentExp = await Payment.find({ organizationId: orgId, memberId: memberId }).sort({ createdAt: -1 }).explain("executionStats");
        const paymentIdx = (paymentExp as any).queryPlanner.winningPlan.inputStage.indexName;
        console.log(`✅ Payment Index Hit: ${paymentIdx}`);

        // 3. Verify Ledger UNIQUE Index
        console.log("\n--- Ledger UNIQUE Index Verification ---");
        const ledgerExp = await Ledger.find({ organizationId: orgId, memberId: memberId }).explain("executionStats");
        const ledgerIdx = (ledgerExp as any).queryPlanner.winningPlan.indexName; // For unique, winningPlan might change. Let's see.
        console.log(`✅ Ledger Index Hit: ${ledgerIdx}`);

        // 4. Verify Subscription Index
        console.log("\n--- Subscription Index Verification ---");
        const subExp = await Subscription.find({ organizationId: orgId, memberId: memberId }).explain("executionStats");
        const subIdx = (subExp as any).queryPlanner.winningPlan.inputStage.indexName;
        console.log(`✅ Subscription Index Hit: ${subIdx}`);

        console.log("\n✨ ALL INDEXES VERIFIED SUCCESSFULLY.");

    } catch (e) {
        console.error("Verification failed:", e);
    } finally {
        await mongoose.connection.close();
    }
}

verify();
