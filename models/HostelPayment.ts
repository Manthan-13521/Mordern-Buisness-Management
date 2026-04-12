import mongoose, { Document, Model, Schema } from "mongoose";

export interface IHostelPayment extends Document {
    hostelId: string;
    memberId: mongoose.Types.ObjectId;
    planId: mongoose.Types.ObjectId;
    amount: number;
    paymentMethod: "cash" | "upi" | "card" | "online";
    transactionId?: string;
    notes?: string;
    idempotencyKey?: string;
    status: "success" | "pending" | "failed" | "refunded";
    recordedBy?: mongoose.Types.ObjectId;
    // Type: initial payment or renewal or balance payment
    paymentType: "initial" | "renewal" | "balance" | "refund" | "settlement" | "rent" | "payment";
    isDeleted: boolean;
    deletedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const hostelPaymentSchema = new Schema<IHostelPayment>(
    {
        hostelId: { type: String, required: true, index: true },
        memberId: { type: Schema.Types.ObjectId, ref: "HostelMember", required: true, index: true },
        planId:   { type: Schema.Types.ObjectId, ref: "HostelPlan",   required: true },
        amount:   { type: Number, required: true, min: 0 },
        paymentMethod: {
            type: String,
            enum: ["cash", "upi", "card", "online"],
            required: true,
        },
        transactionId:  { type: String },
        notes:          { type: String },
        idempotencyKey: { type: String, unique: true, sparse: true },
        status: {
            type: String,
            enum: ["success", "pending", "failed", "refunded"],
            default: "success",
        },
        recordedBy: { type: Schema.Types.ObjectId, ref: "User" },
        paymentType: {
            type: String,
            enum: ["initial", "renewal", "balance", "refund", "settlement", "rent", "payment"],
            default: "initial",
        },
        isDeleted: { type: Boolean, default: false, index: true },
        deletedAt: { type: Date },
    },
    { timestamps: true }
);

hostelPaymentSchema.index({ hostelId: 1, createdAt: -1 });
hostelPaymentSchema.index({ hostelId: 1, memberId: 1 });
hostelPaymentSchema.index({ hostelId: 1, status: 1, createdAt: -1 });
hostelPaymentSchema.index({ createdAt: -1 }, { expireAfterSeconds: 15552000 }); // 6 months TTL

export const HostelPayment: Model<IHostelPayment> =
    mongoose.models.HostelPayment ||
    mongoose.model<IHostelPayment>("HostelPayment", hostelPaymentSchema);
