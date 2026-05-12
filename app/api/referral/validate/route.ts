import { NextResponse } from "next/server";
import { resolveUser, AuthUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";
import { ReferralCode } from "@/models/ReferralCode";

export async function POST(req: Request) {
    try {
        const user = await resolveUser(req) as any;
        if (!user.id) {
            return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        const body = await req.json();
        const { referralCode } = body as {
            referralCode: string;
        };

        if (!referralCode) {
            return NextResponse.json({ error: "Missing referral code" }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        await dbConnect();

        // Find and validate the referral code
        const codeDoc = await ReferralCode.findOne({
            code: referralCode.toUpperCase().trim(),
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
}
