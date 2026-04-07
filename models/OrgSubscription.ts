import mongoose, { Document, Model, Schema } from "mongoose";

export interface IOrgSubscription extends Document {
    orgId: mongoose.Types.ObjectId;
    planId: mongoose.Types.ObjectId;
    status: "active" | "past_due" | "cancelled" | "trialing";
    startDate: Date;
    nextBillingDate: Date;
    lastPaymentId?: string; // Reference to Razorpay or UPI transaction
    createdAt: Date;
    updatedAt: Date;
}

const orgSubscriptionSchema = new Schema<IOrgSubscription>(
    {
        orgId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
        planId: { type: Schema.Types.ObjectId, ref: "SaaSPlan", required: true },
        status: { 
            type: String, 
            enum: ["active", "past_due", "cancelled", "trialing"], 
            default: "trialing",
            index: true
        },
        startDate: { type: Date, required: true, default: Date.now },
        nextBillingDate: { type: Date, required: true },
        lastPaymentId: { type: String }
    },
    { timestamps: true }
);

export const OrgSubscription: Model<IOrgSubscription> =
    mongoose.models.OrgSubscription || mongoose.model<IOrgSubscription>("OrgSubscription", orgSubscriptionSchema);
