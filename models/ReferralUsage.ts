import mongoose, { Document, Model, Schema } from "mongoose";

export interface IReferralUsage extends Document {
    code: string;
    orgId: mongoose.Types.ObjectId;
    discountApplied: number;
    createdAt: Date;
    updatedAt: Date;
}

const referralUsageSchema = new Schema<IReferralUsage>(
    {
        code: { type: String, required: true, index: true },
        orgId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
        discountApplied: { type: Number, required: true, default: 0 }
    },
    { timestamps: true }
);

export const ReferralUsage: Model<IReferralUsage> =
    mongoose.models.ReferralUsage || mongoose.model<IReferralUsage>("ReferralUsage", referralUsageSchema);
