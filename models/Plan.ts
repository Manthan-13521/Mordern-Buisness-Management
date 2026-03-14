import mongoose, { Document, Model, Schema } from "mongoose";

export interface IPlan extends Document {
    name: string;
    poolId: string;
    durationDays?: number;
    durationHours?: number;
    durationMinutes?: number;
    durationSeconds?: number;
    price: number;
    features: string[];
    whatsAppAlert?: boolean;
    allowQuantity?: boolean;
    voiceAlert?: boolean;
    deletedAt?: Date; // Soft delete support
    // New fields for group QR entry
    groupToken?: string | null;
    maxEntriesPerQR?: number;
    remainingEntries?: number;
    createdAt: Date;
    updatedAt: Date;
}

const planSchema = new Schema<IPlan>(
    {
        name: { type: String, required: true },
        poolId: { type: String, required: true, index: true },
        durationDays: { type: Number },
        durationHours: { type: Number },
        durationMinutes: { type: Number },
        durationSeconds: { type: Number },
        price: { type: Number, required: true },
        features: { type: [String], default: [] },
        whatsAppAlert: { type: Boolean, default: false },
        allowQuantity: { type: Boolean, default: false },
        voiceAlert: { type: Boolean, default: false },
        deletedAt: { type: Date, default: null },
        // New fields for group QR entry
        groupToken: { type: String, default: null },
        maxEntriesPerQR: { type: Number, default: 1 }, // quantity of members allowed per QR
        remainingEntries: { type: Number, default: 1 },
    },
    { timestamps: true }
);

export const Plan: Model<IPlan> =
    mongoose.models.Plan || mongoose.model<IPlan>("Plan", planSchema);
