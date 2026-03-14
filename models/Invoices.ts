import mongoose, { Document, Model, Schema } from "mongoose";

export interface IInvoice extends Document {
    poolId: string;
    memberId: mongoose.Types.ObjectId;
    paymentId?: mongoose.Types.ObjectId;
    amount: number;
    billingDate: Date;
    receiptUrl?: string;
    status: "paid" | "pending" | "failed";
    createdAt: Date;
    updatedAt: Date;
}

const invoiceSchema = new Schema<IInvoice>(
    {
        poolId: { type: String, required: true, index: true },
        memberId: { type: Schema.Types.ObjectId, ref: "Member", required: true },
        paymentId: { type: Schema.Types.ObjectId, ref: "Payment" },
        amount: { type: Number, required: true },
        billingDate: { type: Date, default: Date.now },
        receiptUrl: { type: String },
        status: { type: String, enum: ["paid", "pending", "failed"], default: "paid" },
    },
    { timestamps: true }
);

export const Invoice: Model<IInvoice> =
    mongoose.models.Invoice || mongoose.model<IInvoice>("Invoice", invoiceSchema);
