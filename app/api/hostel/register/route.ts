import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { Hostel } from "@/models/Hostel";
import { User } from "@/models/User";
import { HostelSettings } from "@/models/HostelSettings";
import bcrypt from "bcryptjs";
import { checkRateLimit, getClientIp, rateLimitHeaders } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";
import { getPriceKey, SUBSCRIPTION_PRICES } from "@/lib/subscriptionConfig";
import { validateAndCalculateDiscount, recordReferralUsage } from "@/lib/referral";

async function getNextHostelId() {
    const lastHostel = await Hostel.findOne({}, { hostelId: 1 }).sort({ createdAt: -1 });
    if (!lastHostel || !lastHostel.hostelId || !lastHostel.hostelId.startsWith("HOS")) {
        return "HOS001";
    }
    const currentId = parseInt(lastHostel.hostelId.replace("HOS", ""));
    const nextId = isNaN(currentId) ? 1 : currentId + 1;
    return `HOS${nextId.toString().padStart(3, "0")}`;
}

export const dynamic = "force-dynamic";

/**
 * POST /api/hostel/register
 * Public — creates a new hostel tenant + hostel_admin user.
 * Supports optional adminBilling for SuperAdmin manual creation.
 */
export async function POST(req: Request) {
    try {
        await dbConnect();
        
        // ── RATE LIMITING ──
        const ip = getClientIp(req);
        const { allowed, limit, remaining } = checkRateLimit(ip, "/api/hostel/register", "POST");
        if (!allowed) {
            return NextResponse.json(
                { error: "Too many registration attempts. Please try again later." },
                { status: 429, headers: rateLimitHeaders(limit, remaining) }
            );
        }

        const body = await req.json();

        const { hostelName, city, adminEmail, adminName, password, numberOfBlocks, adminBilling, adminPhone } = body;

        if (!hostelName || !city || !adminEmail || !adminName || !password) {
            return NextResponse.json({ error: "Missing required fields" }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        const normalizedEmail = adminEmail.toLowerCase().trim();

        // 1. Explicit check for cleaner UX
        const existingUser = await User.findOne({ email: normalizedEmail }).lean();
        if (existingUser) {
            return NextResponse.json({ error: "An account with this email already exists. Please login." }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        // Generate unique hostelId and slug
        const hostelId = await getNextHostelId();
        const baseSlug = hostelName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        let slug = baseSlug;
        let slugSuffix = 1;
        while (await Hostel.findOne({ slug }).lean()) {
            slug = `${baseSlug}-${slugSuffix++}`;
        }

        const passwordHash = await bcrypt.hash(password, 12);

        // Determine subscription fields based on admin billing
        let subscriptionStatus = "active";
        let subscriptionEndsAt: Date | undefined;
        const activePlan = adminBilling?.planType || "free";

        // SECURITY: For public signup (no adminBilling), always set numberOfBlocks=1.
        // The real block count is set after payment via subscription activation.
        // For admin mode (adminBilling present), use the selected block count.
        const effectiveBlocks = adminBilling ? numberOfBlocks : 1;

        let usedReferralDoc = null;
        let discountApplied = 0;

        if (adminBilling) {
            const now = new Date();
            // Hostel plans map: block-based durations default to yearly
            const days = activePlan === "trial" ? 7 : 365;
            subscriptionEndsAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
            subscriptionStatus = "active";

            // Calculate authoritative server price
            let amountINR = 0;
            let priceKey = activePlan === "trial" ? "trial" : getPriceKey("block-based", "hostel", effectiveBlocks);
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

        // Map activePlan (frontend ID) to model enum: free, starter, pro, enterprise
        const modelPlanMap: Record<string, "free" | "starter" | "pro" | "enterprise"> = {
            "1-block": "starter",
            "2-block": "pro",
            "3-block": "pro",
            "4-block": "enterprise",
            free: "free",
            pro: "pro",
            enterprise: "enterprise",
        };
        const modelPlan = modelPlanMap[activePlan] || "free";


        // Create hostel, admin user, and settings in parallel
        try {
            const { withTransaction } = await import("@/lib/withTransaction");
            const result = await withTransaction(async (session) => {
                const hostel = new Hostel({
                    hostelId,
                    hostelName,
                    slug,
                    city,
                    adminEmail: normalizedEmail,
                    adminPhone,
                    numberOfBlocks: effectiveBlocks,
                    status: "ACTIVE",
                    plan: modelPlan,
                    subscriptionStatus,
                    subscriptionEndsAt,
                });

                await hostel.save({ session });

                // Create SaaSPlan lookup for Organization
                const { SaaSPlan } = await import("@/models/SaaSPlan");
                const planMap: Record<string, string> = {
                    "1-block": "Starter",
                    "2-block": "Pro",
                    "3-block": "Pro",
                    "4-block": "Enterprise",
                    free: "Starter",
                    pro: "Pro",
                    enterprise: "Enterprise"
                };
                const planSearchName = planMap[activePlan] || "Starter";
                const planDoc = await SaaSPlan.findOne({ name: { $regex: new RegExp(planSearchName, "i") } }).session(session || null) || await SaaSPlan.findOne({}).session(session || null);

                const admin = new User({
                    name: adminName || "Hostel Administrator",
                    email: normalizedEmail,
                    passwordHash,
                    role: "hostel_admin",
                    phone: adminPhone,
                    hostelId: hostelId,
                    // Add subscription to User for system-wide consistency
                    subscription: adminBilling ? {
                        module: "hostel",
                        planType: "block-based",
                        blocks: numberOfBlocks as any,
                        pricePaid: adminBilling.amount,
                        startDate: new Date(),
                        expiryDate: subscriptionEndsAt || new Date(),
                        status: "active"
                    } : undefined
                });

                await admin.save({ session });

                // Create Organization for SuperAdmin dashboard tracking
                const { Organization } = await import("@/models/Organization");
                const newOrgList = await Organization.create([{
                    name: hostelName,
                    ownerId: admin._id,
                    planId: planDoc?._id || admin._id,
                    hostelIds: [hostelId],
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
                        orgId: newOrg._id, // Point to Organization instead of Hostel
                        amount: adminBilling.amount,
                        method: adminBilling.paymentMode === "razorpay" ? "razorpay" : adminBilling.paymentMode === "upi" ? "upi" : adminBilling.paymentMode === "cash" ? "cash" : "manual",
                        paymentMode: `${adminBilling.paymentMode?.toUpperCase()} (Admin: ${adminBilling.payerName || "SuperAdmin"})`,
                        periodStart: now,
                        periodEnd,
                    }], { session });
                }

                await HostelSettings.create([{ hostelId, whatsappEnabled: false }], { session });

                return { hostel, admin };
            });

            // AUDIT: Log new hostel registration
            logger.audit({
                type: "ADMIN_ACTION",
                userId: result.admin._id.toString(),
                hostelId: hostelId,
                ip,
                meta: { 
                    action: "HOSTEL_REGISTERED", 
                    hostelName: result.hostel.hostelName,
                    plan: modelPlan 
                }
            });

            return NextResponse.json({ success: true, hostelSlug: result.hostel.slug, hostelName: result.hostel.hostelName }, {  status: 201 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private", ...rateLimitHeaders(limit, remaining) } });
        } catch (err: any) {
            // Handle race condition or unexpected Mongo unique constraint failure
            if (err.code === 11000) {
                return NextResponse.json({ error: "An account with this email already exists." }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
            }
            throw err; // bubble up to general catch
        }
    } catch (error: any) {
        console.error("[POST /api/hostel/register]", error);
        return NextResponse.json({ error: error?.message || "Server error" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}

