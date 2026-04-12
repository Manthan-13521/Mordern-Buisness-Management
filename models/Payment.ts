import mongoose, { Document, Model, Schema } from "mongoose";

export interface IPayment extends Document {
    organizationId?: string; // Prompt 0.1 Partition Key
    memberId: mongoose.Types.ObjectId;
    poolId: string;
    planId: mongoose.Types.ObjectId;
    memberCollection: "members" | "entertainment_members";
    amount: number;
    paymentMethod: "cash" | "upi" | "razorpay_online";
    transactionId?: string;
    razorpayOrderId?: string;
    idempotencyKey?: string; // Prevents duplicate payment submissions
    clientId?: string;       // Offline Sync deduplication key
    date: Date;
    paidAt?: Date;
    status: "success" | "pending" | "failed" | "refunded";
    recordedBy?: mongoose.Types.ObjectId;
    notes?: string;
    isDeleted: boolean;
    deletedAt?: Date;
    isArchived: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
    {
        organizationId: { type: String, index: true }, // Prompt 0.1 Partition Key
        memberId: {
            type: Schema.Types.ObjectId,
            ref: "Member",
            required: true,
            index: true,
        },
        poolId: { type: String, index: true, required: true },
        planId: { type: Schema.Types.ObjectId, ref: "Plan", required: true },
        memberCollection: {
            type: String,
            enum: ["members", "entertainment_members"],
            default: "members",
        },
        amount: { type: Number, required: true, min: 0 },
        paymentMethod: {
            type: String,
            enum: ["cash", "upi", "razorpay_online"],
            required: true,
        },
        transactionId: { type: String },
        razorpayOrderId: { type: String, unique: true, sparse: true },
        // Fix #11 — idempotency key prevents duplicate payment submissions
        idempotencyKey: { type: String, unique: true, sparse: true },
        clientId: { type: String, unique: true, sparse: true },
        date: { type: Date, default: Date.now, index: true },
        paidAt: { type: Date, index: true },
        status: {
            type: String,
            enum: ["success", "pending", "failed", "refunded"],
            default: "success",
        },
        recordedBy: { type: Schema.Types.ObjectId, ref: "User" },
        notes: { type: String },
        isDeleted: { type: Boolean, default: false, index: true },
        deletedAt: { type: Date },
        isArchived: { type: Boolean, default: false },
    },
    { timestamps: true }
);

// Compound query indexes
paymentSchema.index({ organizationId: 1, memberId: 1, createdAt: -1 }, { background: true }); // Prompt 0.1
paymentSchema.index({ poolId: 1, createdAt: -1 });
paymentSchema.index({ poolId: 1, memberId: 1 });

// Section 2C — additional performance indexes
paymentSchema.index({ memberId: 1, createdAt: -1 });
paymentSchema.index({ createdAt: -1 }, { expireAfterSeconds: 15552000 }); // 6 months TTL
paymentSchema.index({ paymentMethod: 1 });
paymentSchema.index({ poolId: 1, status: 1, date: -1 });
paymentSchema.index({ poolId: 1, isArchived: 1, date: -1 });

export const Payment: Model<IPayment> =
    mongoose.models.Payment || mongoose.model<IPayment>("Payment", paymentSchema);
