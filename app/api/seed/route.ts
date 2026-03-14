import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { User } from "@/models/User";
import { Plan } from "@/models/Plan";
import { PlatformAdmin } from "@/models/PlatformAdmin";
import bcrypt from "bcryptjs";

export async function GET(req: Request) {
    // Caution: Protect this route or use it only for initial setup
    try {
        await connectDB();

        // We use updateOne with upsert to ensure we update existing users or create them if missing.
        const passwordHashAdmin = await bcrypt.hash("admin789", 10);
        const passwordHashOperator = await bcrypt.hash("operator234", 10);
        const passwordHashSuperAdmin = await bcrypt.hash("superadmin456", 10);

        await User.updateOne(
            { role: "admin" },
            {
                $set: {
                    name: "Admin",
                    email: "admin@tspools.com",
                    passwordHash: passwordHashAdmin,
                }
            },
            { upsert: true }
        );

        await User.updateOne(
            { role: "operator" },
            {
                $set: {
                    name: "Operator",
                    email: "operator@tspools.com",
                    passwordHash: passwordHashOperator,
                }
            },
            { upsert: true }
        );

        // Seed Super Admin
        await PlatformAdmin.updateOne(
            { email: "superadmin@tspools.com" },
            {
                $set: {
                    passwordHash: passwordHashSuperAdmin,
                    role: "superadmin",
                }
            },
            { upsert: true }
        );

        // Check if plans exist to avoid duplicate key errors on name (if they have unique constraints)
        const plansExist = await Plan.countDocuments();
        if (plansExist === 0) {
            await Plan.create([
            {
                name: "Monthly Pass",
                durationDays: 30,
                price: 1500,
                features: ["Access all days", "1 Hour per day"],
            },
            {
                name: "Quarterly Pass",
                durationDays: 90,
                price: 4000,
                features: ["Access all days", "1.5 Hours per day", "Locker facility"],
            },
            {
                name: "Daily Pass",
                durationDays: 1,
                price: 100,
                features: ["Single entry", "1 Hour access"],
            },
        ]);
        }

        return NextResponse.json({ message: "Seed data created successfully" });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Seed failed" }, { status: 500 });
    }
}
