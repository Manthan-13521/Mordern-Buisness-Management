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
        const { poolName, city, adminName, adminEmail, adminPhone, password, plan, adminBilling } = body;

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

        // Determine subscription fields based on admin billing or default
        let subscriptionStatus = "active";
        let subscriptionEndsAt: Date | undefined;
        const activePlan = adminBilling?.planType || plan || "free";

        if (adminBilling) {
            const now = new Date();
            const durationDays: Record<string, number> = {
                trial: 7,
                quarterly: 90,
                yearly: 365,
            };
            const days = durationDays[adminBilling.planType] || 30;
            subscriptionEndsAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
            subscriptionStatus = "active";
        }

        const modelPlanMap: Record<string, "free" | "starter" | "pro" | "enterprise"> = {
            trial: "starter",
            quarterly: "pro",
            yearly: "enterprise",
            free: "free",
            starter: "starter",
            pro: "pro",
            enterprise: "enterprise",
        };
        const modelPlan = modelPlanMap[activePlan] || "free";

        try {
            const newPool = new Pool({
                poolId,
                poolName,
                slug,
                adminEmail: normalizedEmail,
                adminPhone,
                location: city,
                status: "ACTIVE",
                plan: modelPlan,
                capacity: modelPlan === "enterprise" ? 1000 : (modelPlan === "pro" ? 500 : 200),
                maxMembers: modelPlan === "enterprise" ? 5000 : (modelPlan === "pro" ? 2000 : 1000),
                maxStaff: modelPlan === "enterprise" ? 100 : (modelPlan === "pro" ? 50 : 20),
                subscriptionStatus,
                ...(subscriptionEndsAt ? { subscriptionEndsAt } : {}),
            });

            await newPool.save();

            // Create SaaSPlan lookup for Organization
            const { SaaSPlan } = await import("@/models/SaaSPlan");
            const planMap: Record<string, string> = {
                trial: "Starter",
                quarterly: "Pro",
                yearly: "Enterprise",
                free: "Starter",
                pro: "Pro",
                enterprise: "Enterprise"
            };
            const planSearchName = planMap[activePlan] || "Starter";
            const planDoc = await SaaSPlan.findOne({ name: { $regex: new RegExp(planSearchName, "i") } }) || await SaaSPlan.findOne({});

            const newAdmin = new User({
                name: adminName || "Pool Administrator",
                email: normalizedEmail,
                passwordHash,
                role: "admin",
                phone: adminPhone,
                poolId: poolId,
                // Add subscription to User for system-wide consistency
                subscription: adminBilling ? {
                    module: "pool",
                    planType: adminBilling.planType,
                    pricePaid: adminBilling.amount,
                    startDate: new Date(),
                    expiryDate: subscriptionEndsAt || new Date(),
                    status: "active"
                } : undefined
            });

            await newAdmin.save();

            // Create Organization for SuperAdmin dashboard tracking
            const { Organization } = await import("@/models/Organization");
            const newOrg = await Organization.create({
                name: poolName,
                ownerId: newAdmin._id,
                planId: planDoc?._id || newAdmin._id, // Fallback if no plan found
                poolIds: [poolId],
                status: subscriptionStatus === "active" ? "active" : "trial",
                currentPeriodEnd: subscriptionEndsAt,
                trialEndsAt: activePlan === "trial" ? subscriptionEndsAt : undefined
            });

            // If admin billing is present, create a BillingLog entry
            if (adminBilling && adminBilling.amount > 0) {
                try {
                    const { BillingLog } = await import("@/models/BillingLog");
                    const now = new Date();
                    const periodEnd = subscriptionEndsAt || now;

                    await BillingLog.create({
                        orgId: newOrg._id, // Point to Organization instead of Pool
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

