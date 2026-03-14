/**
 * Automated occupancy cleanup script.
 * Releases pool capacity for expired sessions.
 * Run this via cron or as a background service.
 */
const mongoose = require("mongoose");
const path = require("path");

// Load environment variables if .env file exists
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error("[Occupancy Cleanup] Error: MONGODB_URI not found");
    process.exit(1);
}

// Minimal model definitions for the script
const PoolSession = mongoose.model("PoolSession", new mongoose.Schema({
    numPersons: Number,
    expiryTime: Date,
    status: String
}, { timestamps: true }));

const Settings = mongoose.model("Settings", new mongoose.Schema({
    currentOccupancy: Number
}, { collection: "settings" }));

async function cleanupExpiredSessions() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("[Occupancy Cleanup] Connected to MongoDB.");

        const now = new Date();
        const expiredSessions = await PoolSession.find({
            status: "active",
            expiryTime: { $lte: now }
        });

        if (expiredSessions.length === 0) {
            console.log("[Occupancy Cleanup] No expired sessions found.");
            await mongoose.disconnect();
            return;
        }

        console.log(`[Occupancy Cleanup] Found ${expiredSessions.length} sessions to clean up.`);

        for (const session of expiredSessions) {
            // Atomic decrement to prevent race conditions if possible, 
            // though Settings is usually a single document.
            await Settings.updateOne({}, { $inc: { currentOccupancy: -session.numPersons } });
            session.status = "completed";
            await session.save();
            console.log(`[Occupancy Cleanup] Freed ${session.numPersons} slots from session ${session._id}`);
        }

        // Final safety check: ensure currentOccupancy doesn't go negative
        const finalSettings = await Settings.findOne();
        if (finalSettings && finalSettings.currentOccupancy < 0) {
            await Settings.updateOne({}, { $set: { currentOccupancy: 0 } });
            console.log("[Occupancy Cleanup] Reset negative occupancy to 0.");
        }

        await mongoose.disconnect();
        console.log("[Occupancy Cleanup] Done.");
    } catch (err) {
        console.error("[Occupancy Cleanup] Fatal error:", err);
        process.exit(1);
    }
}

// Run immediately
cleanupExpiredSessions();
