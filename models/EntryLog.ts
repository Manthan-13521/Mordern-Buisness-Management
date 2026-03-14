import mongoose, { Document, Model, Schema } from "mongoose";

export interface IEntryLog extends Document {
    memberId: mongoose.Types.ObjectId;
    poolId?: string;
    scanTime: Date;
    status: "granted" | "denied";
    reason?: string;
    operatorId?: mongoose.Types.ObjectId;
    qrToken?: string; // token used at time of scan (for audit)
    rawPayload?: string; // the actual scanned string before verification
    numPersons?: number; // the quantity/group size used at scan time
    createdAt: Date;
    updatedAt: Date;
}

const entryLogSchema = new Schema<IEntryLog>(
    {
        memberId: { type: Schema.Types.ObjectId, ref: "Member", index: true },
        poolId: { type: String, index: true, sparse: true },
        scanTime: { type: Date, default: Date.now, index: true },
        status: { type: String, enum: ["granted", "denied"], required: true },
        reason: { type: String },
        operatorId: { type: Schema.Types.ObjectId, ref: "User" },
        qrToken: { type: String },
        rawPayload: { type: String },
        numPersons: { type: Number, default: 1 },
    },
    { timestamps: true }
);

// Compound index for fast recent-scan queries (used in cooldown check)
entryLogSchema.index({ memberId: 1, scanTime: -1 });

export const EntryLog: Model<IEntryLog> =
    mongoose.models.EntryLog || mongoose.model<IEntryLog>("EntryLog", entryLogSchema);
