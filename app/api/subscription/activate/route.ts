import { NextResponse } from "next/server";
import { resolveUser, AuthUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";
import { activateSubscription } from "@/lib/services/subscriptionActivationService";
import { logger } from "@/lib/logger";
import { requestContext } from "@/lib/requestContext";

/**
 * POST /api/subscription/activate
 * FALLBACK: Frontend-side Razorpay success verification.
 * Used when webhook hasn't fired yet (race condition protection).
 */
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
            const user = await resolveUser(req) as any;
            if (!user.id) {
                return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
            }

            const body = await req.json();
            const { razorpayOrderId, razorpayPaymentId, razorpaySignature, isMock: rawMock, planType, module, blocks, referralCode } = body;

            // SECURITY: isMock must NEVER be honored in production — prevents free subscription exploit
            const isMock = process.env.NODE_ENV !== "production" && rawMock === true;

            // SECURITY: For real (non-mock) payments, planType/module/blocks are IGNORED.
            // The activation service derives them from Razorpay order notes (source of truth).
            // Mock mode still accepts them since there's no real Razorpay order to query.
            if (isMock && (!planType || !module)) {
                return NextResponse.json({ error: "planType and module are required for mock activation" }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
            }

            if (!isMock && (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature)) {
                return NextResponse.json({ error: "Payment verification data missing" }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
            }

            await dbConnect();

            const { expiryDate, amountINR } = await activateSubscription({
                razorpayOrderId:   razorpayOrderId || `mock_order_${Date.now()}`,
                razorpayPaymentId: razorpayPaymentId || `mock_pay_${Date.now()}`,
                razorpaySignature: razorpaySignature || "",
                isMock:            isMock === true,
                userId:            user.id,
                // SECURITY: For real payments, pass placeholder values.
                // activateSubscription() will override with Razorpay order notes.
                // For mock mode, pass the client-provided values.
                planType:          isMock ? planType : (planType || "yearly"),
                module:            isMock ? module : (module || "pool"),
                blocks:            isMock ? (blocks ? parseInt(blocks) : undefined) : undefined,
                // Pass referralCode so usage tracking works in mock mode.
                // In real mode, activateSubscription() will prefer Razorpay order notes.
                referralCode:      referralCode || undefined,
            });

            return NextResponse.json({
                success:    true,
                expiryDate,
                amountINR,
                message:    "Subscription activated successfully",
            }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        } catch (error: any) {
            logger.error("Subscription activation error", { error: error?.message });
            return NextResponse.json({ error: error?.message || "Activation failed" }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }
        });
            
}
