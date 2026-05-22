import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { Ad } from "@/models/Ad";
import mongoose from "mongoose";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { adId, event } = body;

        if (!adId || !event || (event !== "impression" && event !== "click")) {
            return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
        }

        if (!mongoose.Types.ObjectId.isValid(adId)) {
            return NextResponse.json({ error: "Invalid Ad ID" }, { status: 400 });
        }

        await dbConnect();

        // Use atomic $inc to prevent race conditions during high concurrency
        const update = event === "impression" ? { $inc: { impressions: 1 } } : { $inc: { clicks: 1 } };
        
        await Ad.updateOne({ _id: adId }, update);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("POST /api/ads/track error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
