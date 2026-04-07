import { config } from "dotenv";
config({ path: ".env.local" });
import { dbConnect } from "../lib/mongodb";
import { HostelLog } from "../models/HostelLog";
import { HostelRegistrationLog } from "../models/HostelRegistrationLog";
import { HostelPaymentLog } from "../models/HostelPaymentLog";
import mongoose from "mongoose";

async function run() {
    await dbConnect();
    console.log("Connected to MongoDB.");

    const oldLogs = await HostelLog.find({}).lean() as any[];
    console.log(`Found ${oldLogs.length} old logs to process.`);

    let regCount = 0;
    let payCount = 0;

    for (const log of oldLogs) {
        if (log.type === "registration") {
            // Extract room number from description: "registered in Room 101, Block A"
            const roomMatch = log.description.match(/Room ([a-zA-Z0-9]+)/i);
            const roomNumber = roomMatch ? roomMatch[1] : "Unknown";

            await HostelRegistrationLog.create({
                hostelId: log.hostelId,
                memberId: log.memberId || "Unknown",
                memberName: log.memberName || "Unknown",
                roomNumber: roomNumber,
                join_date: log.createdAt,
                createdBy: log.performedBy || "System",
                createdAt: log.createdAt // Keep original timestamp
            });
            regCount++;
        } else if (log.type === "payment_update" || log.type === "renewal") {
            // Extract amount from description: "Payment of ₹1000 ..." or "Paid: ₹1500"
            const amountMatch = log.description.match(/₹(\d+(\.\d+)?)/);
            const amount = amountMatch ? parseFloat(amountMatch[1]) : 0;
            
            // Map payment type: if renewal, use renewal. Else fallback to balance.
            let paymentType = "balance";
            if (log.type === "renewal") paymentType = "renewal";
            if (log.description.toLowerCase().includes("initial")) paymentType = "initial";

            await HostelPaymentLog.create({
                hostelId: log.hostelId,
                memberId: log.memberId || "Unknown",
                memberName: log.memberName || "Unknown",
                amount: amount,
                paymentType: paymentType,
                payment_date: log.createdAt,
                createdBy: log.performedBy || "System",
                createdAt: log.createdAt // Keep original timestamp
            });
            payCount++;
        }
    }

    console.log(`Migration Complete:`);
    console.log(`- Inserted ${regCount} Registration Logs`);
    console.log(`- Inserted ${payCount} Payment Logs`);

    // Optional: Only keep 'delete' logs in the old collection (or keep everything for backup)
    // We will keep everything for data safety!
    
    process.exit(0);
}

run().catch(err => {
    console.error("Migration failed", err);
    process.exit(1);
});
