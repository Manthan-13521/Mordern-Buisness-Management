import mongoose, { Document, Model, Schema } from "mongoose";

export interface IBillingLog extends Document {
    orgId: mongoose.Types.ObjectId;
    amount: number;
    method: "upi" | "razorpay" | "manual";
    periodStart: Date;
    periodEnd: Date;
    createdAt: Date;
    updatedAt: Date;
}

const billingLogSchema = new Schema<IBillingLog>(
    {
        orgId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
        amount: { type: Number, required: true },
        method: { type: String, enum: ["upi", "razorpay", "manual"], required: true },
        periodStart: { type: Date, required: true },
        periodEnd: { type: Date, required: true }
    },
    { timestamps: true }
);

// L-6 FIX: Compound index for per-org billing queries in superadmin dashboard
billingLogSchema.index({ orgId: 1, createdAt: -1 });

export const BillingLog: Model<IBillingLog> =
    mongoose.models.BillingLog || mongoose.model<IBillingLog>("BillingLog", billingLogSchema);
