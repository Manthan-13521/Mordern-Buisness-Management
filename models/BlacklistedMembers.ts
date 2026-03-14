import mongoose, { Document, Model, Schema } from "mongoose";

export interface IBlacklistedMember extends Document {
    memberId: string;
    poolId: string;
    reason: string;
    blacklistedBy: mongoose.Types.ObjectId; // User ID of admin
    createdAt: Date;
    updatedAt: Date;
}

const blacklistedMemberSchema = new Schema<IBlacklistedMember>(
    {
        memberId: { type: String, required: true, index: true },
        poolId: { type: String, required: true, index: true },
        reason: { type: String, required: true },
        blacklistedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    },
    { timestamps: true }
);

// A member can only be blacklisted once per pool
blacklistedMemberSchema.index({ memberId: 1, poolId: 1 }, { unique: true });

export const BlacklistedMember: Model<IBlacklistedMember> =
    mongoose.models.BlacklistedMember || mongoose.model<IBlacklistedMember>("BlacklistedMember", blacklistedMemberSchema);
