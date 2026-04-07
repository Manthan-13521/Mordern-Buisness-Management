import mongoose, { Document, Model, Schema } from "mongoose";

export interface IHostelAnalytics extends Document {
    hostelId: string;
    yearMonth: string; // e.g. "2026-04"
    totalIncome: number;
    newMembers: number;
    checkedOutMembers: number;
    createdAt: Date;
    updatedAt: Date;
}

const hostelAnalyticsSchema = new Schema<IHostelAnalytics>(
    {
        hostelId: { type: String, required: true, index: true },
        yearMonth: { type: String, required: true, index: true },
        totalIncome: { type: Number, default: 0 },
        newMembers: { type: Number, default: 0 },
        checkedOutMembers: { type: Number, default: 0 },
    },
    { timestamps: true }
);

// Crucial: Unique compound index to prevent duplicate months and race conditions per tenant
hostelAnalyticsSchema.index({ hostelId: 1, yearMonth: 1 }, { unique: true });

// Ensure strict cleanup for HMR
if (mongoose.models.HostelAnalytics) {
    delete mongoose.models.HostelAnalytics;
}

export const HostelAnalytics: Model<IHostelAnalytics> = mongoose.model<IHostelAnalytics>(
    "HostelAnalytics",
    hostelAnalyticsSchema
);
