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

        if (!body.pendingId && (!businessName || !adminEmail || !password)) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        await dbConnect();

        let normalizedEmail = "";
        if (!body.pendingId) {
            normalizedEmail = adminEmail.toLowerCase().trim();

            // Check if email is already in use
            const existingUser = await User.findOne({ email: normalizedEmail });
            if (existingUser) {
                return NextResponse.json({ error: "An account with this email already exists. Please login." }, { status: 400 });
            }
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
        // PUBLIC FLOW — MODE 2: Create Razorpay order for existing pending reg
        // Called from /business/select-plan page with pendingId + planType
        // ══════════════════════════════════════════════════════════════════════
        if (body.pendingId) {
            const { pendingId, planType: orderPlanType, referralCode } = body;
            const planType = orderPlanType || "quarterly";

            if (planType !== "quarterly" && planType !== "yearly" && planType !== "trial") {
                return NextResponse.json({ error: "Invalid plan type." }, { status: 400 });
            }

            const pending = await PendingBusinessRegistration.findById(pendingId);
            if (!pending || pending.status !== "pending") {
                return NextResponse.json({ error: "Registration not found or already completed. Please register again." }, { status: 404 });
            }

            // Update the planType on pending record
            pending.planType = planType;
            await pending.save();

            // Get server-side price
            const priceKey = planType === "trial" ? "trial" : getPriceKey(planType as any, "business");
            if (!priceKey) {
                return NextResponse.json({ error: "Invalid plan configuration" }, { status: 400 });
            }
            let amountINR = SUBSCRIPTION_PRICES[priceKey];

            // Apply referral discount
            if (referralCode && planType !== "trial") {
                try {
                    const { ReferralCode } = await import("@/models/ReferralCode");
                    const codeDoc = await ReferralCode.findOne({
                        code: referralCode.toUpperCase().trim(),
                        isActive: true
                    });
                    if (codeDoc && (!codeDoc.expiresAt || new Date(codeDoc.expiresAt) > new Date()) && (codeDoc.maxUses === 0 || codeDoc.usedCount < codeDoc.maxUses)) {
                        let discount = 0;
                        if (codeDoc.discountType === "percentage") {
                            discount = (amountINR * codeDoc.discountValue) / 100;
                        } else if (codeDoc.discountType === "flat") {
                            discount = codeDoc.discountValue;
                        }
                        amountINR -= discount;
                        if (amountINR <= 0) amountINR = 1;
                        amountINR = Math.floor(amountINR);
                        
                        // Persist validated referral code
                        pending.referralCode = codeDoc.code;
                    }
                } catch (refErr) {
                    console.error("Referral validation failed (non-fatal):", refErr);
                }
            }

            const amountPaise = amountINR * 100;

            // Create Razorpay order (or mock)
            if (!isRazorpayConfigured || !razorpay) {
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
                    email: pending.adminEmail,
                    referralCode: referralCode || "",
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
        }

        // ══════════════════════════════════════════════════════════════════════
        // PUBLIC FLOW — MODE 1: Create pending registration (no payment yet)
        // Called from /business/register page after form submission
        // ══════════════════════════════════════════════════════════════════════
        // Check for existing pending registration with same email
        const existingPending = await PendingBusinessRegistration.findOne({
            adminEmail: normalizedEmail,
            status: "pending",
        });
        if (existingPending) {
            // Update password hash just in case they used a different one for retry
            const updatedHash = await bcrypt.hash(password, 10);
            existingPending.passwordHash = updatedHash;
            // Also update any other form fields in case they corrected a typo
            existingPending.businessName = businessName;
            existingPending.adminName = adminName;
            existingPending.adminPhone = adminPhone;
            await existingPending.save();

            // If there's already a pending registration, reuse it — redirect to plan page
            return NextResponse.json({ 
                pendingId: existingPending._id.toString(),
                businessName: existingPending.businessName,
                email: existingPending.adminEmail,
                name: existingPending.adminName,
                phone: existingPending.adminPhone,
                alreadyExists: true,
            });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        // Create pending registration (no plan yet — chosen on select-plan page)
        const pending = await PendingBusinessRegistration.create({
            businessName,
            adminName,
            adminEmail: normalizedEmail,
            adminPhone,
            passwordHash,
            address,
            gstNumber,
            planType: "quarterly", // default, will be updated on select-plan page
            status: "pending",
        });

        return NextResponse.json({
            pendingId: pending._id.toString(),
            businessName: pending.businessName,
            email: pending.adminEmail,
            name: pending.adminName,
            phone: pending.adminPhone,
        });

    } catch (error: any) {
        logger.error("Business registration error", { error: error?.message });
        return NextResponse.json({ error: error.message || "Failed to register business" }, { status: 500 });
    }
}
