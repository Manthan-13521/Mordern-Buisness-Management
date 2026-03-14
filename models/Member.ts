import mongoose, { Document, Model, Schema } from "mongoose";
import crypto from "crypto";

export interface IMember extends Document {
    memberId: string;
    poolId?: string;
    faceScanEnabled?: boolean;
    name: string;
    phone: string;
    age?: number;
    dob?: Date;
    aadharCard?: string;
    address?: string;
    photoUrl?: string;
    planId: mongoose.Types.ObjectId;
    planQuantity?: number;
    totalEntriesAllowed?: number;
    entriesUsed?: number;
    startDate: Date;
    expiryDate: Date;
    qrCodeUrl?: string;
    qrToken: string;
    lastScannedAt?: Date;
    status: "active" | "expired" | "deleted";
    deletedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
    rotateQrToken(): Promise<string>;
}

const memberSchema = new Schema<IMember>(
    {
        memberId: { type: String, required: true, index: true },
        poolId: { type: String, required: true, index: true },
        faceScanEnabled: { type: Boolean, default: false },
        name: { type: String, required: true },
        phone: { type: String, required: true, index: true },
        age: { type: Number },
        dob: { type: Date },
        aadharCard: { type: String },
        address: { type: String },
        photoUrl: { type: String },
        planId: { type: Schema.Types.ObjectId, ref: "Plan", required: true },
        planQuantity: { type: Number, default: 1 },
        totalEntriesAllowed: { type: Number, default: 1 },
        entriesUsed: { type: Number, default: 0 },
        startDate: { type: Date, required: true },
        expiryDate: { type: Date, required: true, index: true },
        qrCodeUrl: { type: String },
        qrToken: { type: String, required: true, default: () => crypto.randomUUID() },
        lastScannedAt: { type: Date },
        status: {
            type: String,
            enum: ["active", "expired", "deleted"],
            default: "active",
            index: true,
        },
        deletedAt: { type: Date },
    },
    { timestamps: true }
);

// Tenant isolation constraint
memberSchema.index({ poolId: 1, memberId: 1 }, { unique: true });

// Method to rotate QR token after each successful scan
memberSchema.methods.rotateQrToken = async function () {
    this.qrToken = crypto.randomUUID();
    await this.save();
    return this.qrToken;
};

export const Member: Model<IMember> =
    mongoose.models.Member || mongoose.model<IMember>("Member", memberSchema);
