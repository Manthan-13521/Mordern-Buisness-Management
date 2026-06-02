import mongoose, { Document, Model, Schema } from "mongoose";

export interface IPaymentIntent extends Document {
    razorpayOrderId: string;
    userId: mongoose.Types.ObjectId;
    module: "pool" | "hostel" | "business";
    planType: "trial" | "quarterly" | "yearly" | "block-based";
    blocks?: number;
    amountPaise: number;
    referralCode?: string;
    status: "pending" | "success" | "failed" | "expired";
    createdAt: Date;
    updatedAt: Date;
}

const paymentIntentSchema = new Schema<IPaymentIntent>(
    {
        razorpayOrderId: { type: String, required: true, unique: true },
        userId:          { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
        module:          { type: String, enum: ["pool", "hostel", "business"], required: true },
        planType:        { type: String, enum: ["trial", "quarterly", "yearly", "block-based"], required: true },
        blocks:          { type: Number },
        amountPaise:     { type: Number, required: true },
        referralCode:    { type: String },
        status:          { type: String, enum: ["pending", "success", "failed", "expired"], default: "pending", index: true },
    },
    { timestamps: true }
);

// Compound index for recovery cron: find old pending intents efficiently
paymentIntentSchema.index({ status: 1, createdAt: 1 });

// TTL: auto-delete resolved intents after 90 days (keeps collection lean)
// Note: TTL only deletes documents; "pending" intents are kept indefinitely until resolved
paymentIntentSchema.index(
    { updatedAt: 1 },
    { expireAfterSeconds: 90 * 24 * 60 * 60, partialFilterExpression: { status: { $in: ["success", "expired"] } } }
);

export const PaymentIntent: Model<IPaymentIntent> =
    mongoose.models.PaymentIntent || mongoose.model<IPaymentIntent>("PaymentIntent", paymentIntentSchema);
