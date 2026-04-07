import mongoose from "mongoose";
import { dbConnect } from "./lib/mongodb";
import { HostelLog } from "./models/HostelLog";
import { HostelRegistrationLog } from "./models/HostelRegistrationLog";
import { HostelPaymentLog } from "./models/HostelPaymentLog";

async function check() {
    await dbConnect();
    const hlCount = await HostelLog.countDocuments();
    const hrlCount = await HostelRegistrationLog.countDocuments();
    const hplCount = await HostelPaymentLog.countDocuments();
    
    console.log("HostelLog Count:", hlCount);
    console.log("HostelRegistrationLog Count:", hrlCount);
    console.log("HostelPaymentLog Count:", hplCount);

    if (hrlCount > 0) {
        const sample = await HostelRegistrationLog.findOne().lean();
        console.log("Sample Registration Log:", JSON.stringify(sample, null, 2));
    }
    
    process.exit(0);
}

check();
