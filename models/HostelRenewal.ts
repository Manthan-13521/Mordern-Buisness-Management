import mongoose, { Document, Model, Schema } from "mongoose";

export interface IHostelRenewal extends Document {
    hostelId: string;
    memberId: mongoose.Types.ObjectId;
    oldPlanId: mongoose.Types.ObjectId;
    newPlanId: mongoose.Types.ObjectId;
    oldExpiry: Date;
    newExpiry: Date;
    paidAmount: number;
    paymentMode: string;
    transactionId?: string;
    notes?: string;
    renewedBy?: string;
    idempotencyKey?: string;
    createdAt: Date;
}

const hostelRenewalSchema = new Schema<IHostelRenewal>(
    {
        hostelId:      { type: String, required: true, index: true },
        memberId:      { type: Schema.Types.ObjectId, ref: "HostelMember", required: true, index: true },
        oldPlanId:     { type: Schema.Types.ObjectId, ref: "HostelPlan", required: true },
        newPlanId:     { type: Schema.Types.ObjectId, ref: "HostelPlan", required: true },
        oldExpiry:     { type: Date, required: true },
        newExpiry:     { type: Date, required: true },
        paidAmount:    { type: Number, required: true, min: 0 },
        paymentMode:   { type: String, required: true, default: "cash" },
        transactionId: { type: String },
        notes:         { type: String },
        renewedBy:     { type: String },
        idempotencyKey:{ type: String, unique: true, sparse: true },
    },
    { timestamps: true }
);

hostelRenewalSchema.index({ hostelId: 1, memberId: 1 });
hostelRenewalSchema.index({ hostelId: 1, createdAt: -1 });

export const HostelRenewal: Model<IHostelRenewal> =
    mongoose.models.HostelRenewal ||
    mongoose.model<IHostelRenewal>("HostelRenewal", hostelRenewalSchema);
