import mongoose from "mongoose";
import { dbConnect } from "../../lib/mongodb";
import { Payment } from "../../models/Payment";
import { HostelPayment } from "../../models/HostelPayment";
import { BusinessTransaction } from "../../models/BusinessTransaction";

async function runAudit() {
  await dbConnect();
  console.log("Connected to MongoDB.");
  
  const results: any[] = [];
  
  const queries = [
    {
      name: "Dashboard Analytics (Club)",
      collection: "Payment",
      query: Payment.find({ date: { $gte: new Date(Date.now() - 30*24*60*60*1000) } })
    },
    {
      name: "Hostel Analytics (Hostel)",
      collection: "HostelPayment",
      query: HostelPayment.find({ payment_date: { $gte: new Date(Date.now() - 30*24*60*60*1000) } })
    },
    {
      name: "Business Dashboard Transactions (Business)",
      collection: "BusinessTransaction",
      query: BusinessTransaction.find({ date: { $gte: new Date(Date.now() - 30*24*60*60*1000) } })
    }
  ];

  for (const q of queries) {
    try {
      // Using explicit `.explain('executionStats')`
      const explainData = (await q.query.explain("executionStats")) as any;
      
      let executionStats;
      // Depending on mongoose version, explain structure varies slightly
      if (Array.isArray(explainData)) {
          executionStats = explainData[0]?.executionStats;
      } else {
          executionStats = explainData.executionStats || (explainData.queryPlanner && explainData.queryPlanner.winningPlan) || explainData;
      }

      results.push({
        queryName: q.name,
        collection: q.collection,
        winningPlan: executionStats?.winningPlan?.stage || executionStats?.queryPlanner?.winningPlan?.stage || "UNKNOWN",
        executionTimeMillis: executionStats?.executionTimeMillis || 0,
        totalDocsExamined: executionStats?.totalDocsExamined || 0,
        totalKeysExamined: executionStats?.totalKeysExamined || 0,
      });
    } catch (err: any) {
       console.error(`Failed to explain ${q.name}:`, err.message);
    }
  }

  console.log(JSON.stringify(results, null, 2));
  process.exit(0);
}

runAudit();
