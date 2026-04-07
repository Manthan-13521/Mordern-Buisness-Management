import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import { User } from "@/models/User";
import { getPriceKey, SUBSCRIPTION_PRICES, SubscriptionPlanType, SubscriptionModule } from "@/lib/subscriptionConfig";
import Razorpay from "razorpay";

const razorpay = new Razorpay({
    key_id:     process.env.RAZORPAY_KEY_ID     || "rzp_test_mock",
    key_secret: process.env.RAZORPAY_KEY_SECRET || "mock_secret",
});

/**
 * POST /api/subscription/create-order
 * Body: { planType: "trial"|"quarterly"|"yearly"|"block-based", module: "pool"|"hostel", blocks?: 1-4 }
 */
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions) as any;
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { planType, module, blocks } = body as {
            planType: SubscriptionPlanType;
            module:   SubscriptionModule;
            blocks?:  number;
        };

        if (!planType || !module) {
            return NextResponse.json({ error: "planType and module are required" }, { status: 400 });
        }

        // Validate module matches session user type
        const userModule: SubscriptionModule = session.user.hostelId ? "hostel" : "pool";
        if (module !== userModule) {
            return NextResponse.json({ error: "Module mismatch with your account type" }, { status: 400 });
        }

        await dbConnect();
        const user = await User.findById(session.user.id).lean() as any;
        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        // Trial guard
        if (planType === "trial" && user.trial?.isUsed) {
            return NextResponse.json(
                { error: "Free trial already used. Please select a paid plan." },
                { status: 400 }
            );
        }

        const priceKey = getPriceKey(planType, module, blocks);
        if (!priceKey) {
            return NextResponse.json({ error: "Invalid plan combination" }, { status: 400 });
        }

        const amountINR   = SUBSCRIPTION_PRICES[priceKey];
        const amountPaise = amountINR * 100;

        // Mock mode
        if (!process.env.RAZORPAY_KEY_ID) {
            return NextResponse.json({
                orderId:  `order_mock_${Date.now()}`,
                amount:   amountPaise,
                currency: "INR",
                isMock:   true,
                planType,
                module,
                blocks,
                amountINR,
            });
        }

        const order = await razorpay.orders.create({
            amount:   amountPaise,
            currency: "INR",
            receipt:  `sub_${session.user.id}_${planType}_${Date.now()}`,
            notes: {
                userId:  session.user.id,
                planType,
                module,
                blocks:  blocks?.toString() || "",
            },
        });

        return NextResponse.json({
            orderId:  order.id,
            amount:   amountPaise,
            currency: "INR",
            isMock:   false,
            planType,
            module,
            blocks,
            amountINR,
        });
    } catch (error: any) {
        console.error("[POST /api/subscription/create-order]", error);
        return NextResponse.json({ error: "Failed to create subscription order" }, { status: 500 });
    }
}
