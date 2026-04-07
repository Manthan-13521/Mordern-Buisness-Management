import mongoose, { Document, Model, Schema } from "mongoose";

export interface IOrgUsage extends Document {
    orgId: mongoose.Types.ObjectId;
    peakMembers: number;        // Highest watermark of member count reached
    lastResetAt: Date;          // For resetting on cycle refresh (if needed)
    createdAt: Date;
    updatedAt: Date;
}

const orgUsageSchema = new Schema<IOrgUsage>(
    {
        orgId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, unique: true },
        peakMembers: { type: Number, default: 0 },
        lastResetAt: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

export const OrgUsage: Model<IOrgUsage> =
    mongoose.models.OrgUsage || mongoose.model<IOrgUsage>("OrgUsage", orgUsageSchema);
