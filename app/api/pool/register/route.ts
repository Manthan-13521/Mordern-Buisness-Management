import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { Pool } from "@/models/Pool";
import { User } from "@/models/User";
import bcrypt from "bcryptjs";
import crypto from "crypto";

async function getNextPoolId() {
    const lastPool = await Pool.findOne({}, { poolId: 1 }).sort({ createdAt: -1 });
    if (!lastPool || !lastPool.poolId) {
        return "POOL001";
    }
    const currentId = parseInt(lastPool.poolId.replace("POOL", ""));
    const nextId = currentId + 1;
    return `POOL${nextId.toString().padStart(3, "0")}`;
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { poolName, city, adminEmail, adminPhone, plan } = body;

        if (!poolName || !city || !adminEmail) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        await connectDB();

        // Check if email is already in use
        const existingUser = await User.findOne({ email: adminEmail });
        if (existingUser) {
            return NextResponse.json({ error: "Admin email already in use" }, { status: 400 });
        }

        const poolId = await getNextPoolId();
        
        // Generate a unique slug
        let baseSlug = poolName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        let slug = baseSlug;
        let counter = 1;
        while (await Pool.findOne({ slug })) {
            slug = `${baseSlug}-${counter}`;
            counter++;
        }

        // Generate strong random password
        const rawPassword = crypto.randomBytes(6).toString("hex"); // e.g. "a1b2c3d4e5f6"
        const passwordHash = await bcrypt.hash(rawPassword, 10);

        const newPool = new Pool({
            poolId,
            poolName,
            slug,
            adminEmail,
            adminPhone,
            location: city,
            status: "ACTIVE",
            capacity: plan === "enterprise" ? 500 : (plan === "pro" ? 200 : 100)
        });

        await newPool.save();

        const newAdmin = new User({
            name: "Pool Administrator",
            email: adminEmail,
            passwordHash,
            role: "admin",
            poolId: poolId
        });

        await newAdmin.save();

        return NextResponse.json({
            success: true,
            pool: {
                poolId: newPool.poolId,
                poolName: newPool.poolName,
                slug: newPool.slug,
                status: newPool.status
            },
            admin: {
                email: newAdmin.email,
                name: newAdmin.name
            },
            rawPassword
        }, { status: 201 });

    } catch (error) {
        console.error("Pool Registration Error:", error);
        return NextResponse.json({ error: "Failed to register pool" }, { status: 500 });
    }
}
