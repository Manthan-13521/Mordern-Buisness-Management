require("dotenv").config({ path: ".env.local" });
const mongoose = require("mongoose");

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to DB");
    
    // Import Member model
    const memberSchema = new mongoose.Schema({
        memberId: { type: String, required: true },
        poolId: { type: String, required: true },
        name: { type: String, required: true },
        phone: { type: String, required: true },
        planId: { type: mongoose.Schema.Types.ObjectId, required: true },
        qrToken: { type: String, required: true },
    }, { strict: false });
    const Member = mongoose.model("MemberTest", memberSchema, "members");
    
    try {
        const dummy = new Member({
            memberId: "M9999",
            poolId: "POOL001",
            name: "Test Name",
            phone: "9999999999",
            planId: new mongoose.Types.ObjectId(),
            qrToken: "test",
        });
        await dummy.save();
        console.log("Success");
        await Member.deleteOne({ memberId: "M9999" });
    } catch (e) {
        console.error("ValidationError:", e.message);
    }
    process.exit(0);
}
run();
