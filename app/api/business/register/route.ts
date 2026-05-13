import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { Business } from "@/models/Business";
import { User } from "@/models/User";
import { logger } from "@/lib/logger";
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
        const { businessName, adminName, adminEmail, adminPhone, password, address, adminBilling } = body;

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
        if (!baseSlug) baseSlug = `biz-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
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

            // If admin billing is present, create a BillingLog entry
            if (adminBilling && adminBilling.amount > 0) {
                try {
                    const { BillingLog } = await import("@/models/BillingLog");
                    const now = new Date();
                    const durationDays: Record<string, number> = {
                        quarterly: 90,
                        yearly: 365,
                    };
                    const days = durationDays[adminBilling.planType] || 90;
                    const periodEnd = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

                    await BillingLog.create({
                        orgId: newBusiness._id,
                        amount: adminBilling.amount,
                        method: adminBilling.paymentMode === "razorpay" ? "razorpay" : adminBilling.paymentMode === "upi" ? "upi" : adminBilling.paymentMode === "cash" ? "cash" : "manual",
                        paymentMode: `${adminBilling.paymentMode?.toUpperCase()} (Admin: ${adminBilling.payerName || "SuperAdmin"})`,
                        periodStart: now,
                        periodEnd,
                    });
                } catch (billingErr) {
                    console.error("BillingLog creation failed (non-fatal):", billingErr);
                }
            }

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
                return NextResponse.json({ error: "An account with this email already exists." }, { status: 400 });
            }
            throw err;
        }

    } catch (error: any) {
        logger.error("Business registration error", { error: error?.message });
        return NextResponse.json({ error: error.message || "Failed to register business" }, { status: 500 });
    }
}

