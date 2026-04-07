import mongoose, { Document, Model, Schema } from "mongoose";

export interface ILedger extends Document {
    organizationId?: string; // Prompt 0.1 Partition Key
    memberId: mongoose.Types.ObjectId;
    poolId: string;
    totalDue: number;
    totalPaid: number;
    balance: number; // strictly tracked as (totalDue - totalPaid)
    creditBalance: number; // tracks overpayments
    lastBilledCycle?: string; // used for atomic concurrency guard
    createdAt: Date;
    updatedAt: Date;
}

const ledgerSchema = new Schema<ILedger>(
    {
        organizationId: { type: String, index: true }, // Prompt 0.1 Partition Key
        memberId:  { type: Schema.Types.ObjectId, ref: "Member", required: true, index: true, unique: true },
        poolId:    { type: String, required: true, index: true },
        totalDue:  { type: Number, required: true, default: 0 },
        totalPaid: { type: Number, required: true, default: 0 },
        balance:   { type: Number, required: true, default: 0 },
        creditBalance: { type: Number, required: true, default: 0 },
        lastBilledCycle: { type: String },
    },
    { timestamps: true }
);

// High-speed dashboard defaulter read queries
ledgerSchema.index({ organizationId: 1, memberId: 1 }, { unique: true, background: true }); // Prompt 0.1
ledgerSchema.index({ poolId: 1, balance: 1 });

export const Ledger: Model<ILedger> =
    mongoose.models.Ledger || mongoose.model<ILedger>("Ledger", ledgerSchema);
