import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { Pool } from "@/models/Pool";
import { User } from "@/models/User";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { getPriceKey, SUBSCRIPTION_PRICES } from "@/lib/subscriptionConfig";
import { validateAndCalculateDiscount, recordReferralUsage } from "@/lib/referral";
import { requestContext } from "@/lib/requestContext";

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

        const requestId = req ? (req.headers.get("x-request-id") || crypto.randomUUID()) : crypto.randomUUID();
        const clientIp = req ? (req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown") : "unknown";
        const routePath = req ? new URL(req.url).pathname : "unknown";
        const requestMethod = "POST";

        return requestContext.run({
            requestId,
            ip: clientIp,
            route: routePath,
            method: requestMethod,
            startTime: Date.now()
        }, async () => {
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
            let usedReferralDoc = null;
            let discountApplied = 0;

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

                // Calculate authoritative server price
                let amountINR = 0;
                let priceKey = activePlan === "trial" ? "trial" : getPriceKey(activePlan as any, "pool");
                if (priceKey && SUBSCRIPTION_PRICES[priceKey] !== undefined) {
                    amountINR = SUBSCRIPTION_PRICES[priceKey];
                }

                // Validate and apply discount
                const validation = await validateAndCalculateDiscount(
                    adminBilling.referralCode,
                    activePlan,
                    amountINR
                );
                amountINR = validation.finalAmount;
                discountApplied = validation.discountApplied;
                usedReferralDoc = validation.usedReferralDoc;

                // Override client amount
                adminBilling.amount = amountINR;
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
                const { withTransaction } = await import("@/lib/withTransaction");
                const result = await withTransaction(async (session) => {
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

                    await newPool.save({ session });

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
                    const planDoc = await SaaSPlan.findOne({ name: { $regex: new RegExp(planSearchName, "i") } }).session(session || null) || await SaaSPlan.findOne({}).session(session || null);

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

                    await newAdmin.save({ session });

                    // Create Organization for SuperAdmin dashboard tracking
                    const { Organization } = await import("@/models/Organization");
                    const newOrgList = await Organization.create([{
                        name: poolName,
                        ownerId: newAdmin._id,
                        planId: planDoc?._id || newAdmin._id, // Fallback if no plan found
                        poolIds: [poolId],
                        status: subscriptionStatus === "active" ? "active" : "trial",
                        currentPeriodEnd: subscriptionEndsAt,
                        trialEndsAt: activePlan === "trial" ? subscriptionEndsAt : undefined,
                        referralCodeUsed: usedReferralDoc ? usedReferralDoc.code : undefined
                    }], { session });
                    const newOrg = newOrgList[0];

                    if (usedReferralDoc) {
                        await recordReferralUsage(usedReferralDoc, newOrg._id, discountApplied, session);
                    }

                    // If admin billing is present, create a BillingLog entry
                    if (adminBilling && adminBilling.amount > 0) {
                        const { BillingLog } = await import("@/models/BillingLog");
                        const now = new Date();
                        const periodEnd = subscriptionEndsAt || now;

                        await BillingLog.create([{
                            orgId: newOrg._id, // Point to Organization instead of Pool
                            amount: adminBilling.amount,
                            method: adminBilling.paymentMode === "razorpay" ? "razorpay" : adminBilling.paymentMode === "upi" ? "upi" : adminBilling.paymentMode === "cash" ? "cash" : "manual",
                            paymentMode: `${adminBilling.paymentMode?.toUpperCase()} (Admin: ${adminBilling.payerName || "SuperAdmin"})`,
                            periodStart: now,
                            periodEnd,
                        }], { session });
                    }

                    return { newPool, newAdmin };
                });

                return NextResponse.json({
                    success: true,
                    pool: {
                        poolId: result.newPool.poolId,
                        poolName: result.newPool.poolName,
                        slug: result.newPool.slug,
                        status: result.newPool.status
                    },
                    admin: {
                        email: result.newAdmin.email,
                        name: result.newAdmin.name
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
        });
            
}

