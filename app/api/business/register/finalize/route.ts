import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { Business } from "@/models/Business";
import { User } from "@/models/User";
import { PendingBusinessRegistration } from "@/models/PendingBusinessRegistration";
import { SubscriptionPaymentLog } from "@/models/SubscriptionPaymentLog";
import { getPriceKey, SUBSCRIPTION_PRICES } from "@/lib/subscriptionConfig";
import { logger } from "@/lib/logger";
import crypto from "crypto";

export const runtime = "nodejs";

async function getNextBusinessId() {
    const lastBusiness = await Business.findOne({}, { businessId: 1 }).sort({ createdAt: -1 });
    if (!lastBusiness || !lastBusiness.businessId) {
        return "BIZ001";
    }
    const currentId = parseInt(lastBusiness.businessId.replace("BIZ", ""));
    const nextId = currentId + 1;
    return `BIZ${nextId.toString().padStart(3, "0")}`;
}

/**
 * POST /api/business/register/finalize
 * Called after Razorpay payment success for public business registration.
 * Verifies payment, then atomically creates Business + User + Organization.
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { pendingRegistrationId, razorpayOrderId, razorpayPaymentId, razorpaySignature, isMock: rawMock } = body;

        // SECURITY: isMock must NEVER be honored in production
        const isMock = process.env.NODE_ENV !== "production" && rawMock === true;

        if (!pendingRegistrationId) {
            return NextResponse.json({ error: "Missing pendingRegistrationId" }, { status: 400 });
        }

        if (!isMock && (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature)) {
            return NextResponse.json({ error: "Payment verification data missing" }, { status: 400 });
        }

        await dbConnect();

        // 1. Load pending registration
        const pending = await PendingBusinessRegistration.findById(pendingRegistrationId);
        if (!pending) {
            return NextResponse.json({ error: "Registration not found or expired" }, { status: 404 });
        }

        // IDEMPOTENCY: If already completed, return existing data
        if (pending.status === "completed") {
            const existingUser = await User.findOne({ email: pending.adminEmail }).lean() as any;
            const existingBusiness = existingUser?.businessSlug
                ? await Business.findOne({ slug: existingUser.businessSlug }).lean() as any
                : null;
            return NextResponse.json({
                success: true,
                businessSlug: existingBusiness?.slug || existingUser?.businessSlug,
                email: pending.adminEmail,
                alreadyCompleted: true,
            });
        }

        if (pending.status !== "pending") {
            return NextResponse.json({ error: "Registration is no longer valid" }, { status: 400 });
        }

        // 2. Verify Razorpay payment
        if (!isMock) {
            const secret = process.env.RAZORPAY_KEY_SECRET;
            if (!secret) throw new Error("Missing RAZORPAY_KEY_SECRET");

            const expectedSig = crypto
                .createHmac("sha256", secret)
                .update(`${razorpayOrderId}|${razorpayPaymentId}`)
                .digest("hex");

            if (expectedSig !== razorpaySignature) {
                logger.audit({
                    type: "BUSINESS_REGISTRATION_PAYMENT_FAILED",
                    meta: { reason: "signature_mismatch", razorpayOrderId, pendingRegistrationId },
                });
                return NextResponse.json({ error: "Payment signature verification failed" }, { status: 400 });
            }

            // Verify order matches pending registration
            if (pending.razorpayOrderId && pending.razorpayOrderId !== razorpayOrderId) {
                return NextResponse.json({ error: "Order ID mismatch" }, { status: 400 });
            }

            // Fetch order from Razorpay to verify amount
            const { razorpay: rzp } = await import("@/lib/razorpay");
            if (rzp) {
                try {
                    const order = await rzp.orders.fetch(razorpayOrderId) as any;
                    const priceKey = getPriceKey(pending.planType as any, "business");
                    if (priceKey) {
                        const expectedPaise = SUBSCRIPTION_PRICES[priceKey] * 100;
                        const actualPaise = order.amount || 0;
                        if (actualPaise < 100 || actualPaise > expectedPaise) {
                            logger.audit({
                                type: "BUSINESS_REGISTRATION_AMOUNT_MISMATCH",
                                meta: { actualPaise, expectedPaise, razorpayOrderId },
                            });
                            return NextResponse.json({ error: "Payment amount verification failed" }, { status: 400 });
                        }
                    }
                } catch (fetchErr: any) {
                    logger.error("[Business Finalize] Order verification failed", { error: fetchErr.message });
                    throw new Error("Could not verify order with payment gateway");
                }
            }
        }

        // 3. Check email uniqueness again (race condition guard)
        const existingUser = await User.findOne({ email: pending.adminEmail });
        if (existingUser) {
            pending.status = "completed" as any;
            await pending.save();
            return NextResponse.json({ error: "An account with this email was already created." }, { status: 400 });
        }

        // 4. Create Business, User, Organization atomically (idempotent via unique keys)
        const businessId = await getNextBusinessId();
        
        let baseSlug = pending.businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        if (!baseSlug) baseSlug = `biz-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        let slug = baseSlug;
        let counter = 1;
        while (await Business.findOne({ slug })) {
            slug = `${baseSlug}-${counter}`;
            counter++;
        }

        const durationDays: Record<string, number> = { trial: 7, quarterly: 90, yearly: 365 };
        const days = durationDays[pending.planType] || 90;
        const now = new Date();
        const subscriptionEndsAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
        const isTrial = pending.planType === "trial";

        const priceKey = isTrial ? "trial" : getPriceKey(pending.planType as any, "business");
        const amountPaid = priceKey ? SUBSCRIPTION_PRICES[priceKey] : 0;

        try {
            // Create Business
            const newBusiness = new Business({
                businessId,
                name: pending.businessName,
                slug,
                address: pending.address,
                phone: pending.adminPhone,
                gstNumber: pending.gstNumber || undefined,
                isActive: true,
            });
            await newBusiness.save();

            // Create User with active subscription
            const newAdmin = new User({
                name: pending.adminName,
                email: pending.adminEmail,
                passwordHash: pending.passwordHash,
                role: "business_admin",
                phone: pending.adminPhone,
                businessId: businessId,
                businessSlug: slug,
                subscription: {
                    module: "business",
                    planType: pending.planType,
                    pricePaid: amountPaid,
                    startDate: now,
                    expiryDate: subscriptionEndsAt,
                    status: isTrial ? "trial" : "active",
                },
                ...(isTrial ? { trial: { isUsed: true, startDate: now, endDate: subscriptionEndsAt } } : {}),
            });
            await newAdmin.save();

            // Link owner back to business
            newBusiness.ownerId = newAdmin._id;
            await newBusiness.save();

            // Create Organization
            const { SaaSPlan } = await import("@/models/SaaSPlan");
            const planMap: Record<string, string> = {
                trial: "Starter", quarterly: "Pro", yearly: "Enterprise",
            };
            const planSearchName = planMap[pending.planType] || "Pro";
            const planDoc = await SaaSPlan.findOne({ name: { $regex: new RegExp(planSearchName, "i") } }) || await SaaSPlan.findOne({});

            const { Organization } = await import("@/models/Organization");
            const newOrg = await Organization.create({
                name: pending.businessName,
                ownerId: newAdmin._id,
                planId: planDoc?._id || newAdmin._id,
                businessIds: [businessId],
                status: isTrial ? "trial" : "active",
                currentPeriodEnd: subscriptionEndsAt,
                trialEndsAt: isTrial ? subscriptionEndsAt : undefined,
            });

            // Create BillingLog
            try {
                const { BillingLog } = await import("@/models/BillingLog");
                await BillingLog.create({
                    orgId: newOrg._id,
                    amount: amountPaid,
                    method: "razorpay",
                    paymentMode: "Razorpay (Public Registration)",
                    periodStart: now,
                    periodEnd: subscriptionEndsAt,
                });
            } catch (billingErr) {
                console.error("BillingLog creation failed (non-fatal):", billingErr);
            }

            // Create SubscriptionPaymentLog
            await SubscriptionPaymentLog.create({
                userId: newAdmin._id,
                businessId: businessId,
                module: "business",
                planType: pending.planType,
                amount: amountPaid,
                razorpayOrderId: razorpayOrderId || pending.razorpayOrderId || `mock_${Date.now()}`,
                razorpayPaymentId: razorpayPaymentId || `mock_pay_${Date.now()}`,
                status: "success",
            });

            // 5. Mark pending as completed
            pending.status = "completed" as any;
            await pending.save();

            logger.audit({
                type: "BUSINESS_REGISTERED_VIA_PAYMENT",
                userId: newAdmin._id.toString(),
                meta: { businessId, slug, planType: pending.planType, amountPaid },
            });

            // Return success — frontend will call signIn() with password from React state
            return NextResponse.json({
                success: true,
                businessSlug: slug,
                email: pending.adminEmail,
            }, { status: 201 });

        } catch (err: any) {
            if (err.code === 11000) {
                return NextResponse.json({ error: "An account with this email already exists." }, { status: 400 });
            }
            throw err;
        }

    } catch (error: any) {
        logger.error("Business finalize error", { error: error?.message });
        return NextResponse.json({ error: error.message || "Failed to finalize registration" }, { status: 500 });
    }
}
