import mongoose, { Document, Model, Schema } from "mongoose";

export interface IPoolAnalytics extends Document {
    poolId: string;
    yearMonth: string; // e.g. "2026-04"
    totalIncome: number;
    newMembers: number;
    createdAt: Date;
    updatedAt: Date;
}

const poolAnalyticsSchema = new Schema<IPoolAnalytics>(
    {
        poolId: { type: String, required: true, index: true },
        yearMonth: { type: String, required: true, index: true },
        totalIncome: { type: Number, default: 0 },
        newMembers: { type: Number, default: 0 },
    },
    { timestamps: true }
);

// Crucial: Unique compound index to prevent duplicate months and race conditions per tenant
poolAnalyticsSchema.index({ poolId: 1, yearMonth: 1 }, { unique: true });

// Ensure strict cleanup for HMR
if (mongoose.models.PoolAnalytics) {
    delete mongoose.models.PoolAnalytics;
}

export const PoolAnalytics: Model<IPoolAnalytics> = mongoose.model<IPoolAnalytics>(
    "PoolAnalytics",
    poolAnalyticsSchema
);
