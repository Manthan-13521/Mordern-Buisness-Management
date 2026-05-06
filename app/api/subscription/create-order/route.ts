import { NextResponse } from "next/server";
import { resolveUser, AuthUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";
import { User } from "@/models/User";
import { ReferralCode } from "@/models/ReferralCode";
import { getPriceKey, SUBSCRIPTION_PRICES, SubscriptionPlanType, SubscriptionModule } from "@/lib/subscriptionConfig";
import { razorpay, isRazorpayConfigured } from "@/lib/razorpay";
import { createBreaker } from "@/lib/circuitBreaker";

// Circuit breaker for subscription Razorpay calls
const subscriptionBreaker = createBreaker(
    async (options: any) => razorpay!.orders.create(options),
    "razorpay-subscription-orders"
);

/**
 * POST /api/subscription/create-order
 * Body: { planType: "trial"|"quarterly"|"yearly"|"block-based", module: "pool"|"hostel", blocks?: 1-4 }
 */
export async function POST(req: Request) {
    try {
        const user = await resolveUser(req) as any;
        if (!user.id) {
            return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        const body = await req.json();
        const { planType, module, blocks, referralCode } = body as {
            planType: SubscriptionPlanType;
            module:   SubscriptionModule;
            blocks?:  number;
            referralCode?: string;
        };

        if (!planType || !module) {
            return NextResponse.json({ error: "planType and module are required" }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        // Validate module matches user user type
        const userModule: SubscriptionModule = user.hostelId ? "hostel" : "pool";
        if (module !== userModule) {
            return NextResponse.json({ error: "Module mismatch with your account type" }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        await dbConnect();
        const dbUser = await User.findById(user.id).lean() as any;
        if (!dbUser) return NextResponse.json({ error: "User not found" }, {  status: 404 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });

        // Trial guard
        if (planType === "trial" && dbUser.trial?.isUsed) {
            return NextResponse.json({ error: "Free trial already used. Please select a paid plan." }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        const priceKey = getPriceKey(planType, module, blocks);
        if (!priceKey) {
            return NextResponse.json({ error: "Invalid plan combination" }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        let amountINR   = SUBSCRIPTION_PRICES[priceKey];

        // Apply Referral Discount if provided
        if (referralCode && planType !== "trial") {
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
                if (amountINR <= 0) amountINR = 1; // Minimum charge
                amountINR = Math.floor(amountINR);
            }
        }

        const amountPaise = amountINR * 100;

        // Mock mode
        if (!isRazorpayConfigured) {
            return NextResponse.json({
                orderId:  `order_mock_${Date.now()}`,
                amount:   amountPaise,
                currency: "INR",
                isMock:   true,
                planType,
                module,
                blocks,
                amountINR,
                referralCode,
            }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        // Circuit breaker: fails fast if Razorpay is down
        const order = await subscriptionBreaker.fire({
            amount:   amountPaise,
            currency: "INR",
            receipt:  `sub_${user.id}_${planType}_${Date.now()}`,
            notes: {
                userId:  user.id,
                planType,
                module,
                blocks:  blocks?.toString() || "",
                referralCode: referralCode || "",
            },
        }) as any;

        return NextResponse.json({
            orderId:  order.id,
            amount:   amountPaise,
            currency: "INR",
            isMock:   false,
            planType,
            module,
            blocks,
            amountINR,
            referralCode,
        }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    } catch (error: any) {
        // Circuit breaker tripped
        if (error?.message?.includes("Tripped Breaker")) {
            return NextResponse.json({ error: "Payment service temporarily unavailable. Please try again shortly." }, { status: 503, headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }
        console.error("[POST /api/subscription/create-order]", error);
        return NextResponse.json({ error: "Failed to create subscription order" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}
