import { dbConnect } from "./lib/mongodb";
import { SaaSPlan } from "./models/SaaSPlan";

async function run() {
  await dbConnect();
  const plans = await SaaSPlan.find({}).lean();
  console.log("Plans found:", JSON.stringify(plans, null, 2));
  process.exit(0);
}
run();
