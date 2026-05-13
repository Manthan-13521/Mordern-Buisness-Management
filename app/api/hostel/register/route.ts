import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { Hostel } from "@/models/Hostel";
import { User } from "@/models/User";
import { HostelSettings } from "@/models/HostelSettings";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

/**
 * POST /api/hostel/register
 * Public — creates a new hostel tenant + hostel_admin user.
 * Supports optional adminBilling for SuperAdmin manual creation.
 */
export async function POST(req: Request) {
    try {
        await dbConnect();
        const body = await req.json();

        const { hostelName, city, adminEmail, adminName, password, numberOfBlocks, adminBilling } = body;

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
        const hostelId = crypto.randomUUID();
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

        // Create hostel, admin user, and settings in parallel
        try {
            const [hostel] = await Promise.all([
                Hostel.create({
                    hostelId,
                    hostelName,
                    slug,
                    city,
                    adminEmail: normalizedEmail,
                    numberOfBlocks: Math.min(4, Math.max(1, numberOfBlocks || 1)),
                    status: "ACTIVE",
                    plan: activePlan,
                    subscriptionStatus,
                    ...(subscriptionEndsAt ? { subscriptionEndsAt } : {}),
                    isTwilioConnected: false,
                    memberCounter: 0,
                }),
                User.create({
                    name: adminName,
                    email: normalizedEmail,
                    passwordHash,
                    role: "hostel_admin",
                    hostelId,
                    isActive: true,
                }),
                HostelSettings.create({ hostelId, whatsappEnabled: false }),
            ]);

            // If admin billing is present, create a BillingLog entry
            if (adminBilling && adminBilling.amount > 0) {
                try {
                    const { BillingLog } = await import("@/models/BillingLog");
                    const now = new Date();
                    const days = 365;
                    const periodEnd = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

                    await BillingLog.create({
                        orgId: hostel._id,
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

            return NextResponse.json({ success: true, hostelSlug: hostel.slug, hostelName: hostel.hostelName }, {  status: 201 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
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

