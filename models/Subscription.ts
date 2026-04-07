import mongoose, { Document, Model, Schema } from "mongoose";

export interface ISubscription extends Document {
    organizationId?: string; // Prompt 0.1 Partition Key
    memberId: mongoose.Types.ObjectId;
    poolId: string;
    planId: mongoose.Types.ObjectId;
    pendingPlanId?: mongoose.Types.ObjectId;
    startDate: Date;
    billingCycle: "monthly";
    nextDueDate: Date;
    status: "active" | "cancelled" | "expired";
    createdAt: Date;
    updatedAt: Date;
}

const subscriptionSchema = new Schema<ISubscription>(
    {
        organizationId: { type: String, index: true }, // Prompt 0.1 Partition Key
        memberId:    { type: Schema.Types.ObjectId, ref: "Member", required: true, index: true },
        poolId:      { type: String, required: true, index: true },
        planId:      { type: Schema.Types.ObjectId, ref: "Plan", required: true },
        pendingPlanId: { type: Schema.Types.ObjectId, ref: "Plan" },
        startDate:   { type: Date, required: true, default: Date.now },
        billingCycle:{ type: String, enum: ["monthly"], default: "monthly" },
        nextDueDate: { type: Date, required: true, index: true }, // Crucial for rapidly searching who needs billing today
        status:      { type: String, enum: ["active", "cancelled", "expired"], default: "active", index: true },
    },
    { timestamps: true }
);

// High-performance background Cron querying index
subscriptionSchema.index({ organizationId: 1, memberId: 1, status: 1 }, { background: true }); // Prompt 0.1
subscriptionSchema.index({ nextDueDate: 1, status: 1 }, { background: true }); // Prompt 0.1
subscriptionSchema.index({ poolId: 1, nextDueDate: 1, status: 1 });
// Single active subscription assumption guard could be deployed here, but omitted for generic multi-package purchasing

export const Subscription: Model<ISubscription> =
    mongoose.models.Subscription || mongoose.model<ISubscription>("Subscription", subscriptionSchema);
