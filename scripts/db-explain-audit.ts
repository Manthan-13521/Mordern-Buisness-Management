import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import mongoose from "mongoose";

async function runExplainAudit() {
    console.log("=================================================");
    console.log("         AquaSync MongoDB Explain Audit          ");
    console.log("=================================================\n");

    try {
        const { dbConnect } = await import("../lib/mongodb");
        const { Member } = await import("../models/Member");
        const { Payment } = await import("../models/Payment");
        const { EntryLog } = await import("../models/EntryLog");

        await dbConnect();

        const testId = new mongoose.Types.ObjectId().toString();

        const queries = [
            {
                name: "Member.find by poolId",
                model: Member,
                filter: { poolId: testId }
            },
            {
                name: "Payment.find by poolId",
                model: Payment,
                filter: { poolId: testId }
            },
            {
                name: "EntryLog.find by poolId & scanTime",
                model: EntryLog,
                filter: { poolId: testId, scanTime: { $gte: new Date() } }
            }
        ];

        for (const q of queries) {
            console.log(`Running explain for: ${q.name}...`);
            const queryObj = q.model.find(q.filter);
            
            // @ts-ignore
            const explainResult = await queryObj.explain("executionStats");
            const winningStage = explainResult.queryPlanner?.winningPlan?.stage || "UNKNOWN";
            const inputStage = explainResult.queryPlanner?.winningPlan?.inputStage?.stage || "NONE";
            const stats = explainResult.executionStats || {};
            
            console.log(`- Winning Plan Stage: ${winningStage}`);
            if (inputStage !== "NONE") {
                console.log(`- Input Stage: ${inputStage}`);
            }
            console.log(`- Execution Time (ms): ${stats.executionTimeMillis ?? 0}`);
            console.log(`- Total Docs Examined: ${stats.totalDocsExamined ?? 0}`);
            console.log(`- Total Keys Examined: ${stats.totalKeysExamined ?? 0}`);
            
            const hasIndex = winningStage === "IXSCAN" || inputStage === "IXSCAN";
            console.log(`- Status: ${hasIndex ? "✅ INDEX USED (IXSCAN)" : "⚠️ COLLSCAN (No Index)"}\n`);
        }

    } catch (err) {
        console.error("Explain audit failed:", err);
    } finally {
        await mongoose.disconnect();
    }
}

runExplainAudit();
