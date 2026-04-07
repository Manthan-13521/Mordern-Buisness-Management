import mongoose, { Document, Model, Schema } from "mongoose";

export interface ILedgerCycle extends Document {
    memberId: mongoose.Types.ObjectId;
    poolId: string;
    cycleKey: string; // Stored as strict YYYY-MM UTC
    amount: number;
    createdAt: Date;
    updatedAt: Date;
}

const ledgerCycleSchema = new Schema<ILedgerCycle>(
    {
        memberId: { type: Schema.Types.ObjectId, ref: "Member", required: true, index: true },
        poolId:   { type: String, required: true, index: true },
        cycleKey: { type: String, required: true },
        amount:   { type: Number, required: true },
    },
    { timestamps: true }
);

// Idempotent Billing Guard: A member can only ever be billed once per UTC month
ledgerCycleSchema.index({ memberId: 1, cycleKey: 1 }, { unique: true });

export const LedgerCycle: Model<ILedgerCycle> =
    mongoose.models.LedgerCycle || mongoose.model<ILedgerCycle>("LedgerCycle", ledgerCycleSchema);
