import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { Business } from "@/models/Business";
import { User } from "@/models/User";
import { PendingBusinessRegistration } from "@/models/PendingBusinessRegistration";
import { logger } from "@/lib/logger";
import { getPriceKey, SUBSCRIPTION_PRICES } from "@/lib/subscriptionConfig";
import { razorpay, isRazorpayConfigured } from "@/lib/razorpay";
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
        const { businessName, adminName, adminEmail, adminPhone, password, address, gstNumber, adminBilling, planType: selectedPlanType } = body;

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

        // ══════════════════════════════════════════════════════════════════════
        // ADMIN MODE (SuperAdmin ?admin=true) — Keep existing immediate creation
        // ══════════════════════════════════════════════════════════════════════
        if (adminBilling) {
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
            const activePlan = adminBilling?.planType || "free";

            const durationDays: Record<string, number> = {
                quarterly: 90,
                yearly: 365,
            };
            const days = adminBilling ? (durationDays[adminBilling.planType] || 90) : 90;
            const subscriptionEndsAt = adminBilling ? new Date(Date.now() + days * 24 * 60 * 60 * 1000) : undefined;

            try {
                const newBusiness = new Business({
                    businessId,
                    name: businessName,
                    slug,
                    address,
                    phone: adminPhone,
                    gstNumber: gstNumber || undefined,
                    isActive: true,
                });

                await newBusiness.save();

                // Create SaaSPlan lookup for Organization
                const { SaaSPlan } = await import("@/models/SaaSPlan");
                const planMap: Record<string, string> = {
                    quarterly: "Pro",
                    yearly: "Enterprise",
                    free: "Starter",
                    pro: "Pro",
                    enterprise: "Enterprise"
                };
                const planSearchName = planMap[activePlan] || "Starter";
                const planDoc = await SaaSPlan.findOne({ name: { $regex: new RegExp(planSearchName, "i") } }) || await SaaSPlan.findOne({});

                const newAdmin = new User({
                    name: adminName,
                    email: normalizedEmail,
                    passwordHash,
                    role: "business_admin",
                    phone: adminPhone,
                    businessId: businessId,
                    businessSlug: slug,
                    // Business SaaS guard uses User.subscription
                    subscription: adminBilling ? {
                        module: "business",
                        planType: adminBilling.planType,
                        pricePaid: adminBilling.amount,
                        startDate: new Date(),
                        expiryDate: subscriptionEndsAt || new Date(),
                        status: "active"
                    } : undefined
                });

                await newAdmin.save();

                // Link owner back to business
                newBusiness.ownerId = newAdmin._id;
                await newBusiness.save();

                // Create Organization for SuperAdmin dashboard tracking
                const { Organization } = await import("@/models/Organization");
                const newOrg = await Organization.create({
                    name: businessName,
                    ownerId: newAdmin._id,
                    planId: planDoc?._id || newAdmin._id,
                    businessIds: [businessId],
                    status: adminBilling ? "active" : "trial",
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
                            orgId: newOrg._id, // Point to Organization instead of Business for unified analytics
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
        }

        // ══════════════════════════════════════════════════════════════════════
        // PUBLIC FLOW — Payment-first: store pending, create Razorpay order
        // ══════════════════════════════════════════════════════════════════════
        const planType = selectedPlanType || "quarterly";
        if (planType !== "quarterly" && planType !== "yearly") {
            return NextResponse.json({ error: "Invalid plan type. Choose quarterly or yearly." }, { status: 400 });
        }

        // Check for existing pending registration with same email
        const existingPending = await PendingBusinessRegistration.findOne({
            adminEmail: normalizedEmail,
            status: "pending",
        });
        if (existingPending) {
            // If there's already a pending registration, reuse or reject
            return NextResponse.json({ 
                error: "A registration is already pending for this email. Please complete payment or wait 24 hours to try again." 
            }, { status: 409 });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        // Get server-side price
        const priceKey = getPriceKey(planType, "business");
        if (!priceKey) {
            return NextResponse.json({ error: "Invalid plan configuration" }, { status: 400 });
        }
        const amountINR = SUBSCRIPTION_PRICES[priceKey];
        const amountPaise = amountINR * 100;

        // Create pending registration
        const pending = await PendingBusinessRegistration.create({
            businessName,
            adminName,
            adminEmail: normalizedEmail,
            adminPhone,
            passwordHash,
            address,
            gstNumber,
            planType,
            status: "pending",
        });

        // Create Razorpay order (or mock)
        if (!isRazorpayConfigured || !razorpay) {
            // Mock mode for development
            const mockOrderId = `order_mock_biz_${Date.now()}`;
            pending.razorpayOrderId = mockOrderId;
            await pending.save();

            return NextResponse.json({
                pendingId: pending._id.toString(),
                orderId: mockOrderId,
                amount: amountPaise,
                currency: "INR",
                isMock: true,
                planType,
                amountINR,
            });
        }

        // Real Razorpay order
        const shortId = pending._id.toString().slice(-8);
        const receipt = `biz_${shortId}_${planType.slice(0, 4)}_${Date.now()}`.slice(0, 40);

        const order = await razorpay.orders.create({
            amount: amountPaise,
            currency: "INR",
            receipt,
            notes: {
                pendingRegistrationId: pending._id.toString(),
                module: "business",
                planType,
                email: normalizedEmail,
            },
        }) as any;

        pending.razorpayOrderId = order.id;
        await pending.save();

        return NextResponse.json({
            pendingId: pending._id.toString(),
            orderId: order.id,
            amount: amountPaise,
            currency: "INR",
            keyId: process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
            isMock: false,
            planType,
            amountINR,
        });

    } catch (error: any) {
        logger.error("Business registration error", { error: error?.message });
        return NextResponse.json({ error: error.message || "Failed to register business" }, { status: 500 });
    }
}
