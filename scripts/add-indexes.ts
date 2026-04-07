// scripts/add-indexes.ts
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error("Please define the MONGODB_URI environment variable");
    process.exit(1);
}

// Minimal schemas to define collections directly without importing the main app models
// (prevents Next.js environment errors when running raw node script)
const memberSchema = new mongoose.Schema({}, { strict: false });
const Member = mongoose.models.Member || mongoose.model("Member", memberSchema);

const paymentSchema = new mongoose.Schema({}, { strict: false });
const Payment = mongoose.models.Payment || mongoose.model("Payment", paymentSchema);

const ledgerSchema = new mongoose.Schema({}, { strict: false });
const Ledger = mongoose.models.Ledger || mongoose.model("Ledger", ledgerSchema);

const subscriptionSchema = new mongoose.Schema({}, { strict: false });
const Subscription = mongoose.models.Subscription || mongoose.model("Subscription", subscriptionSchema);

async function addIndexes() {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI as string);
    console.log("Connected successfully.\n");

    try {
        console.log("Adding Member indexes...");
        // { organizationId: 1, _id: 1 }
        await Member.collection.createIndex(
            { organizationId: 1, _id: 1 },
            { background: true }
        );
        // { qrToken: 1, organizationId: 1 }
        await Member.collection.createIndex(
            { qrToken: 1, organizationId: 1 },
            { background: true }
        );
        console.log("✅ Member indexes added.");

        console.log("Adding Payment indexes...");
        // { organizationId: 1, memberId: 1, createdAt: -1 }
        await Payment.collection.createIndex(
            { organizationId: 1, memberId: 1, createdAt: -1 },
            { background: true }
        );
        // { clientId: 1, idempotencyKey: 1 } UNIQUE PARTIAL
        await Payment.collection.dropIndex("clientId_1_idempotencyKey_1").catch(() => null);
        await Payment.collection.createIndex(
            { clientId: 1, idempotencyKey: 1 },
            { 
                unique: true, 
                background: true,
                partialFilterExpression: {
                    clientId: { $exists: true },
                    idempotencyKey: { $exists: true }
                }
            }
        );
        console.log("✅ Payment indexes added.");

        console.log("Adding Ledger indexes...");
        // { organizationId: 1, memberId: 1 } UNIQUE
        await Ledger.collection.createIndex(
            { organizationId: 1, memberId: 1 },
            { unique: true, background: true }
        );
        console.log("✅ Ledger indexes added.");

        console.log("Adding Subscription indexes...");
        // { organizationId: 1, memberId: 1, status: 1 }
        await Subscription.collection.createIndex(
            { organizationId: 1, memberId: 1, status: 1 },
            { background: true }
        );
        // { nextBillingDate: 1, status: 1 }
        await Subscription.collection.createIndex(
            { nextBillingDate: 1, status: 1 },
            { background: true }
        );
        console.log("✅ Subscription indexes added.");

        console.log("\n🚀 All background index creation jobs submitted successfully.");

        console.log("\nVerifying indexes using explain()...");
        const explainMember = await Member.find({ organizationId: "test", _id: new mongoose.Types.ObjectId() }).explain("executionStats");
        console.log("Member Index Used:", explainMember[0]?.queryPlanner?.winningPlan?.inputStage?.indexName || explainMember[0]?.queryPlanner?.winningPlan?.indexName || "None");

        const explainPayment = await Payment.find({ organizationId: "test", memberId: new mongoose.Types.ObjectId() }).sort({ createdAt: -1 }).explain("executionStats");
        console.log("Payment Index Used:", explainPayment[0]?.queryPlanner?.winningPlan?.inputStage?.indexName || explainPayment[0]?.queryPlanner?.winningPlan?.indexName || "None");

    } catch (error) {
        console.error("❌ Error creating indexes:", error);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected from MongoDB.");
    }
}

addIndexes().catch(console.error);
