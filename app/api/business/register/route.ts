import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { Business } from "@/models/Business";
import { User } from "@/models/User";
import bcrypt from "bcryptjs";

async function getNextBusinessId() {
    const lastBusiness = await Business.findOne({}, { businessId: 1 }).sort({ createdAt: -1 });
    if (!lastBusiness || !lastBusiness.businessId) {
        return "BIZ001";
    }
    const currentId = parseInt(lastBusiness.businessId.replace("BIZ", ""));
    const nextId = currentId + 1;
    return `BIZ${nextId.toString().padStart(3, "0")}`;
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { businessName, adminName, adminEmail, adminPhone, password, address } = body;

        if (!businessName || !adminEmail || !password) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        await dbConnect();

        const normalizedEmail = adminEmail.toLowerCase().trim();

        // Check if email is already in use
        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return NextResponse.json({ error: "An account with this email already exists. Please login." }, { status: 400 });
        }

        const businessId = await getNextBusinessId();
        
        // Generate a unique slug
        let baseSlug = businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        let slug = baseSlug;
        let counter = 1;
        while (await Business.findOne({ slug })) {
            slug = `${baseSlug}-${counter}`;
            counter++;
        }

        const passwordHash = await bcrypt.hash(password, 10);

        try {
            const newBusiness = new Business({
                businessId,
                name: businessName,
                slug,
                phone: adminPhone,
                address: address,
                isActive: true,
            });

            await newBusiness.save();

            const newAdmin = new User({
                name: adminName || "Business Administrator",
                email: normalizedEmail,
                passwordHash,
                role: "business_admin",
                phone: adminPhone,
                businessId: businessId,
                businessSlug: slug,
            });

            await newAdmin.save();

            return NextResponse.json({
                success: true,
                business: {
                    businessId: newBusiness.businessId,
                    name: newBusiness.name,
                    slug: newBusiness.slug,
                    isActive: newBusiness.isActive
                },
                admin: {
                    email: newAdmin.email,
                    name: newAdmin.name
                }
            }, { status: 201 });
        } catch (err: any) {
            if (err.code === 11000) {
                return NextResponse.json({ error: "Duplicate registration detected." }, { status: 400 });
            }
            throw err;
        }

    } catch (error) {
        console.error("Business Registration Error:", error);
        return NextResponse.json({ error: "Failed to register business" }, { status: 500 });
    }
}
