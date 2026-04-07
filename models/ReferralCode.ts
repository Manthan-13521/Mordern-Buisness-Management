import mongoose, { Document, Model, Schema } from "mongoose";

export interface IReferralCode extends Document {
    code: string;
    createdBy: mongoose.Types.ObjectId; // Ref to SuperAdmin who created it
    discountType: "percentage" | "flat";
    discountValue: number;
    maxUses: number;
    usedCount: number;
    expiresAt?: Date;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const referralCodeSchema = new Schema<IReferralCode>(
    {
        code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
        createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
        discountType: { type: String, enum: ["percentage", "flat"], required: true },
        discountValue: { type: Number, required: true, min: 0 },
        maxUses: { type: Number, required: true, default: 0 }, // 0 meaning unlimited, or specific positive number
        usedCount: { type: Number, default: 0 },
        expiresAt: { type: Date },
        isActive: { type: Boolean, default: true }
    },
    { timestamps: true }
);

export const ReferralCode: Model<IReferralCode> =
    mongoose.models.ReferralCode || mongoose.model<IReferralCode>("ReferralCode", referralCodeSchema);
