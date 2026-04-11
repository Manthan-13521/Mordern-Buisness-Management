import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
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
        const { poolName, city, adminName, adminEmail, adminPhone, password, plan } = body;

        if (!poolName || !city || !adminEmail || !password) {
            return NextResponse.json({ error: "Missing required fields" }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        await dbConnect();

        const normalizedEmail = adminEmail.toLowerCase().trim();

        // Check if email is already in use
        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return NextResponse.json({ error: "An account with this email already exists. Please login." }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
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

        const passwordHash = await bcrypt.hash(password, 10);

        try {
            const newPool = new Pool({
                poolId,
                poolName,
                slug,
                adminEmail: normalizedEmail,
                adminPhone,
                location: city,
                status: "ACTIVE",
                plan: plan || "free",
                capacity: plan === "enterprise" ? 1000 : (plan === "pro" ? 500 : 200),
                maxMembers: plan === "enterprise" ? 5000 : (plan === "pro" ? 2000 : 1000),
                maxStaff: plan === "enterprise" ? 100 : (plan === "pro" ? 50 : 20),
                subscriptionStatus: "active", // Or "trial"
            });

            await newPool.save();

            const newAdmin = new User({
                name: adminName || "Pool Administrator",
                email: normalizedEmail,
                passwordHash,
                role: "admin",
                phone: adminPhone,
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
                }
            }, {  status: 201 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        } catch (err: any) {
            if (err.code === 11000) {
                return NextResponse.json({ error: "An account with this email already exists." }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
            }
            throw err;
        }

    } catch (error) {
        console.error("Pool Registration Error:", error);
        return NextResponse.json({ error: "Failed to register pool" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}
