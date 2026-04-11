import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import { ReferralCode } from "@/models/ReferralCode";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions) as any;
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { referralCode } = body as {
            referralCode: string;
        };

        if (!referralCode) {
            return NextResponse.json({ error: "Missing referral code" }, { status: 400 });
        }

        await dbConnect();

        // Find and validate the referral code
        const codeDoc = await ReferralCode.findOne({
            code: referralCode.toUpperCase().trim(),
            isActive: true
        });

        if (!codeDoc) {
            return NextResponse.json({ error: "Invalid or inactive referral code." }, { status: 400 });
        }

        if (codeDoc.expiresAt && new Date(codeDoc.expiresAt) < new Date()) {
            return NextResponse.json({ error: "This referral code has expired." }, { status: 400 });
        }

        if (codeDoc.maxUses > 0 && codeDoc.usedCount >= codeDoc.maxUses) {
            return NextResponse.json({ error: "This referral code has reached its maximum usage limit." }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            code: codeDoc.code,
            discountType: codeDoc.discountType,
            discountValue: codeDoc.discountValue,
        });

    } catch (error: any) {
        console.error("Referral validation error:", error);
        return NextResponse.json({ error: "Failed to validate referral code" }, { status: 500 });
    }
}
