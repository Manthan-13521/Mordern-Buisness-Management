import mongoose, { Document, Model, Schema } from "mongoose";

export interface IPayment extends Document {
    memberId: mongoose.Types.ObjectId;
    poolId?: string;
    planId: mongoose.Types.ObjectId;
    amount: number;
    paymentMethod: "cash" | "upi" | "razorpay_online";
    transactionId?: string;
    razorpayOrderId?: string; // Unique index to prevent duplicate payment records
    date: Date;
    status: "success" | "pending" | "failed" | "refunded";
    recordedBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
    {
        memberId: { type: Schema.Types.ObjectId, ref: "Member", required: true, index: true },
        poolId: { type: String, index: true, sparse: true },
        planId: { type: Schema.Types.ObjectId, ref: "Plan", required: true },
        amount: { type: Number, required: true },
        paymentMethod: { type: String, enum: ["cash", "upi", "razorpay_online"], required: true },
        transactionId: { type: String },
        razorpayOrderId: { type: String, sparse: true },
        date: { type: Date, default: Date.now, index: true },
        status: {
            type: String,
            enum: ["success", "pending", "failed", "refunded"],
            default: "success",
        },
        recordedBy: { type: Schema.Types.ObjectId, ref: "User", required: false },
    },
    { timestamps: true }
);

// Sparse unique index — only enforces uniqueness when razorpayOrderId is set
paymentSchema.index({ razorpayOrderId: 1 }, { unique: true, sparse: true });

export const Payment: Model<IPayment> =
    mongoose.models.Payment || mongoose.model<IPayment>("Payment", paymentSchema);
