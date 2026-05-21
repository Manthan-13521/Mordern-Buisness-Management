import mongoose from "mongoose";
import { dbConnect } from "./lib/mongodb";
import { Organization } from "./models/Organization";
import { Pool } from "./models/Pool";

async function run() {
    await dbConnect();
    const orgs = await Organization.find({}, "name status createdAt poolIds hostelIds businessIds").lean();
    console.log("Total orgs:", orgs.length);
    console.log("Active orgs (status=active):", orgs.filter(o => o.status === 'active').length);
    console.log("Trial orgs (status=trial):", orgs.filter(o => o.status === 'trial').length);
    console.log("Orgs created in May 2026:", orgs.filter(o => o.createdAt && o.createdAt.getMonth() === 4).length);
    
    const pools = await Pool.find({}, "poolId status createdAt").lean();
    console.log("Total pools:", pools.length);
    console.log("Active pools:", pools.filter(p => p.status === 'ACTIVE').length);
    process.exit(0);
}
run();
