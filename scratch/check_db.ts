import { dbConnect } from "./lib/mongodb";
import { BusinessTransaction } from "./models/BusinessTransaction";

async function check() {
  await dbConnect();
  const latest = await BusinessTransaction.findOne({ category: 'SALE' }).sort({ createdAt: -1 });
  console.log("Latest Sale:", JSON.stringify(latest, null, 2));
  process.exit(0);
}

check();
