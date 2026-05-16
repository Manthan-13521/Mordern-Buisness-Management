const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

// Load MONGODB_URI from .env.local if not in process.env
let MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    try {
        const envLocalPath = path.join(process.cwd(), ".env.local");
        if (fs.existsSync(envLocalPath)) {
            const envLocal = fs.readFileSync(envLocalPath, "utf8");
            const match = envLocal.match(/MONGODB_URI=(.*)/);
            if (match) MONGODB_URI = match[1].trim();
        }
    } catch (e) {
        console.error("Error reading .env.local:", e.message);
    }
}

if (!MONGODB_URI) {
    console.error("❌ ERROR: MONGODB_URI not found in environment or .env.local");
    process.exit(1);
}

const args = process.argv.slice(2);
if (args.length < 2) {
    console.log("Usage: node scripts/update-superadmin.js <new_email> <new_password>");
    process.exit(1);
}

const [newEmail, newPassword] = args;

async function run() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(MONGODB_URI);
        console.log("Connected successfully.");

        const platformAdminSchema = new mongoose.Schema({
            email: { type: String, required: true, unique: true },
            passwordHash: { type: String, required: true },
            role: { type: String, enum: ["superadmin"], default: "superadmin" },
        }, { timestamps: true });

        const PlatformAdmin = mongoose.models.PlatformAdmin || mongoose.model("PlatformAdmin", platformAdminSchema);

        // Find existing superadmin
        // Note: We update the first one found or create a new one if none exists.
        // Usually there's only one.
        let admin = await PlatformAdmin.findOne({ role: "superadmin" });

        const hash = await bcrypt.hash(newPassword, 10);

        if (admin) {
            console.log(`Updating existing superadmin (${admin.email})...`);
            admin.email = newEmail;
            admin.passwordHash = hash;
            await admin.save();
        } else {
            console.log("No superadmin found. Creating new one...");
            await PlatformAdmin.create({
                email: newEmail,
                passwordHash: hash,
                role: "superadmin"
            });
        }

        console.log(`✅ SUCCESS!`);
        console.log(`New Email: ${newEmail}`);
        console.log(`New Password: ${newPassword}`);
        console.log("You can now login at /superadmin/login");

    } catch (err) {
        console.error("❌ ERROR:", err);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
}

run();
