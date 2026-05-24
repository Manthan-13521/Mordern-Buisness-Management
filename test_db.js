import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const adSchema = new mongoose.Schema({}, { strict: false });
const Ad = mongoose.models.Ad || mongoose.model("Ad", adSchema);

async function test() {
    await mongoose.connect(process.env.MONGODB_URI);
    const now = new Date();
    console.log("Now:", now);
    const ads = await Ad.find({}).lean();
    console.log("Total Ads:", ads.length);
    for (const ad of ads) {
        console.log({
            title: ad.title,
            status: ad.status,
            isActive: ad.isActive,
            startDate: ad.startDate,
            endDate: ad.endDate,
            placementSlots: ad.placementSlots,
            isStartPast: ad.startDate <= now,
            isEndFuture: ad.endDate >= now,
            type: ad.type
        });
    }
    process.exit(0);
}
test().catch(console.error);
