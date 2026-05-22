import mongoose from "mongoose";
import { ReferralCode } from "@/models/ReferralCode";

export async function validateAndCalculateDiscount(
    referralCode: string | undefined,
    planType: string,
    baseAmount: number
): Promise<{ finalAmount: number; discountApplied: number; usedReferralDoc: any | null }> {
    if (!referralCode || planType === "trial") {
        return { finalAmount: baseAmount, discountApplied: 0, usedReferralDoc: null };
    }

    let finalAmount = baseAmount;
    let discountApplied = 0;
    let usedReferralDoc = null;

    try {
        const codeDoc = await ReferralCode.findOne({
            code: referralCode.toUpperCase().trim(),
            isActive: true
        });

        if (
            codeDoc && 
            (!codeDoc.expiresAt || new Date(codeDoc.expiresAt) > new Date()) && 
            (codeDoc.maxUses === 0 || codeDoc.usedCount < codeDoc.maxUses)
        ) {
            if (codeDoc.discountType === "percentage") {
                discountApplied = (baseAmount * codeDoc.discountValue) / 100;
            } else if (codeDoc.discountType === "flat") {
                discountApplied = codeDoc.discountValue;
            }
            finalAmount -= discountApplied;
            if (finalAmount <= 0) finalAmount = 1;
            finalAmount = Math.floor(finalAmount);
            usedReferralDoc = codeDoc;
        }
    } catch (refErr) {
        console.error("Referral validation failed (non-fatal):", refErr);
    }

    return { finalAmount, discountApplied, usedReferralDoc };
}

export async function recordReferralUsage(
    usedReferralDoc: any,
    orgId: mongoose.Types.ObjectId | string,
    discountApplied: number,
    session?: mongoose.ClientSession | undefined
): Promise<void> {
    if (!usedReferralDoc) return;
    try {
        // Dynamically import to prevent circular dependencies in API routes if models are intertwined
        const { ReferralUsage } = await import("@/models/ReferralUsage");
        if (session) {
            await ReferralUsage.create([{
                code: usedReferralDoc.code,
                orgId,
                discountApplied,
            }], { session });

            const codeDoc = await ReferralCode.findById(usedReferralDoc._id).session(session || null);
            if (codeDoc) {
                if (codeDoc.maxUses > 0 && codeDoc.usedCount >= codeDoc.maxUses) {
                    throw new Error("Referral code usage limit reached");
                }
                codeDoc.usedCount += 1;
                await codeDoc.save({ session });
            }
        } else {
            await ReferralUsage.create({
                code: usedReferralDoc.code,
                orgId,
                discountApplied,
            });
            usedReferralDoc.usedCount += 1;
            await usedReferralDoc.save();
        }
    } catch (usageErr) {
        console.error("ReferralUsage creation failed:", usageErr);
        if (session) {
            throw usageErr; // throw to abort transaction
        }
    }
}
