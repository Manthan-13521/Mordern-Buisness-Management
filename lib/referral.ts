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
        // Always normalize before lookup — schema uppercase:true is a setter on save, not on query
        const sanitizedCode = referralCode.toUpperCase().trim();

        const codeDoc = await ReferralCode.findOne({
            code: sanitizedCode,
            isActive: true
        });

        if (
            codeDoc && 
            (!codeDoc.expiresAt || new Date(codeDoc.expiresAt) > new Date()) && 
            (codeDoc.maxUses === 0 || (codeDoc.usedCount ?? 0) < codeDoc.maxUses)
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
        const { ReferralUsage } = await import("@/models/ReferralUsage");

        if (session) {
            // Use findOneAndUpdate with atomic increment to prevent race conditions.
            // If maxUses > 0, only increment when usedCount < maxUses.
            const filter: Record<string, any> = { _id: usedReferralDoc._id, isActive: true };
            if (usedReferralDoc.maxUses > 0) {
                filter.$expr = { $lt: ["$usedCount", "$maxUses"] };
            }

            const updated = await ReferralCode.findOneAndUpdate(
                filter,
                { $inc: { usedCount: 1 } },
                { session, returnDocument: 'after' }
            );

            if (!updated && usedReferralDoc.maxUses > 0) {
                // Usage limit reached — abort the transaction
                throw new Error("Referral code usage limit reached during registration");
            }

            await ReferralUsage.create([{
                code: usedReferralDoc.code,
                orgId,
                discountApplied,
            }], { session });

        } else {
            // Atomic increment outside transaction
            const filter: Record<string, any> = { _id: usedReferralDoc._id, isActive: true };
            if (usedReferralDoc.maxUses > 0) {
                filter.$expr = { $lt: ["$usedCount", "$maxUses"] };
            }

            const updated = await ReferralCode.findOneAndUpdate(
                filter,
                { $inc: { usedCount: 1 } },
                { returnDocument: 'after' }
            );

            if (updated) {
                await ReferralUsage.create({
                    code: usedReferralDoc.code,
                    orgId,
                    discountApplied,
                });
            } else {
                console.warn("Referral code usage limit hit or code inactive — skipping usage record.");
            }
        }
    } catch (usageErr) {
        console.error("ReferralUsage creation failed:", usageErr);
        if (session) {
            throw usageErr; // throw to abort transaction
        }
    }
}
