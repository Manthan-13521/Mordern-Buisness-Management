import { NextResponse } from "next/server";
import { resolveUser, AuthUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";
import { ReferralCode } from "@/models/ReferralCode";
import { requestContext } from "@/lib/requestContext";

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
            const user = await resolveUser(req).catch(() => null) as any;
            // User session is not strictly required for validating a referral code (e.g. during onboarding)
            // We removed the `if (!user?.id)` block here.

            const body = await req.json();
            const { referralCode } = body as {
                referralCode: string;
            };

            if (!referralCode) {
                return NextResponse.json({ error: "Missing referral code" }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
            }

            await dbConnect();

            // Normalize: always uppercase + trim before DB lookup
            const sanitizedCode = referralCode.toUpperCase().trim();

            // Find and validate the referral code
            const codeDoc = await ReferralCode.findOne({
                code: sanitizedCode,
                isActive: true
            }).lean() as any;

            if (!codeDoc) {
                return NextResponse.json({ error: "Invalid or inactive referral code." }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
            }

            if (codeDoc.expiresAt && new Date(codeDoc.expiresAt) < new Date()) {
                return NextResponse.json({ error: "This referral code has expired." }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
            }

            // Proper limit check: compare actual numeric values (not string refs)
            if (codeDoc.maxUses > 0 && (codeDoc.usedCount || 0) >= codeDoc.maxUses) {
                return NextResponse.json({ error: "This referral code has reached its maximum usage limit." }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
            }

            return NextResponse.json({
                success: true,
                code: codeDoc.code,
                discountType: codeDoc.discountType,
                discountValue: codeDoc.discountValue,
                remainingUses: codeDoc.maxUses > 0 ? codeDoc.maxUses - (codeDoc.usedCount || 0) : null,
            }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });

        } catch (error: any) {
            console.error("Referral validation error:", error);
            return NextResponse.json({ error: "Failed to validate referral code" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }
        });
            
}
