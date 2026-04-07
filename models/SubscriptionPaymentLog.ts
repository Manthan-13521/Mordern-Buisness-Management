import mongoose, { Document, Model, Schema } from "mongoose";

export interface ISubscriptionPaymentLog extends Document {
    userId: mongoose.Types.ObjectId;
    poolId?: string;       // pool admin
    hostelId?: string;     // hostel admin
    module: "pool" | "hostel";
    planType: "trial" | "quarterly" | "yearly" | "block-based";
    blocks?: number;
    amount: number;        // in ₹ (not paise)
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    status: "success" | "failed" | "pending";
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

const subscriptionPaymentLogSchema = new Schema<ISubscriptionPaymentLog>(
    {
        userId:            { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
        poolId:            { type: String, index: true, sparse: true },
        hostelId:          { type: String, index: true, sparse: true },
        module:            { type: String, enum: ["pool", "hostel"], required: true },
        planType:          { type: String, enum: ["trial", "quarterly", "yearly", "block-based"], required: true },
        blocks:            { type: Number },
        amount:            { type: Number, required: true, min: 0 },
        razorpayOrderId:   { type: String, index: true, sparse: true },
        razorpayPaymentId: { type: String, index: true, sparse: true },
        status:            { type: String, enum: ["success", "failed", "pending"], default: "pending" },
        notes:             { type: String },
    },
    { timestamps: true }
);

subscriptionPaymentLogSchema.index({ userId: 1, createdAt: -1 });

export const SubscriptionPaymentLog: Model<ISubscriptionPaymentLog> =
    mongoose.models.SubscriptionPaymentLog ||
    mongoose.model<ISubscriptionPaymentLog>("SubscriptionPaymentLog", subscriptionPaymentLogSchema);
