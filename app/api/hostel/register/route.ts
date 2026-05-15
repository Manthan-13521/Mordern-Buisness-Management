import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { Hostel } from "@/models/Hostel";
import { User } from "@/models/User";
import { HostelSettings } from "@/models/HostelSettings";
import bcrypt from "bcryptjs";
import { checkRateLimit, getClientIp, rateLimitHeaders } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";

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

        if (adminBilling) {
            const now = new Date();
            // Hostel plans map: block-based durations default to yearly
            const days = 365;
            subscriptionEndsAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
            subscriptionStatus = "active";
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
            const hostel = new Hostel({
                hostelId,
                hostelName,
                slug,
                city,
                adminEmail: normalizedEmail,
                adminPhone,
                numberOfBlocks,
                status: "ACTIVE",
                plan: modelPlan,
                subscriptionStatus,
                subscriptionEndsAt,
            });

            await hostel.save();

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
            const planDoc = await SaaSPlan.findOne({ name: { $regex: new RegExp(planSearchName, "i") } }) || await SaaSPlan.findOne({});

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

            await admin.save();

            // Create Organization for SuperAdmin dashboard tracking
            const { Organization } = await import("@/models/Organization");
            const newOrg = await Organization.create({
                name: hostelName,
                ownerId: admin._id,
                planId: planDoc?._id || admin._id,
                hostelIds: [hostelId],
                status: subscriptionStatus === "active" ? "active" : "trial",
                currentPeriodEnd: subscriptionEndsAt,
                trialEndsAt: activePlan === "trial" ? subscriptionEndsAt : undefined
            });

            await HostelSettings.create({ hostelId, whatsappEnabled: false });

            // AUDIT: Log new hostel registration
            logger.audit({
                type: "ADMIN_ACTION",
                userId: admin._id.toString(),
                hostelId: hostelId,
                ip,
                meta: { 
                    action: "HOSTEL_REGISTERED", 
                    hostelName: hostel.hostelName,
                    plan: modelPlan 
                }
            });

            return NextResponse.json({ success: true, hostelSlug: hostel.slug, hostelName: hostel.hostelName }, {  status: 201 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private", ...rateLimitHeaders(limit, remaining) } });
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

