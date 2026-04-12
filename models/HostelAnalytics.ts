import mongoose, { Document, Model, Schema } from "mongoose";

export interface IHostelAnalytics extends Document {
    hostelId: string;
    yearMonth: string; // e.g. "2026-04"
    totalIncome: number;
    totalOccupancy: number; // Snapshot of active members/beds taken
    createdAt: Date;
    updatedAt: Date;
}

const hostelAnalyticsSchema = new Schema<IHostelAnalytics>(
    {
        hostelId: { type: String, required: true, index: true },
        yearMonth: { type: String, required: true, index: true },
        totalIncome: { type: Number, default: 0 },
        totalOccupancy: { type: Number, default: 0 },
    },
    { timestamps: true }
);

hostelAnalyticsSchema.index({ hostelId: 1, yearMonth: 1 }, { unique: true });

if (mongoose.models.HostelAnalytics) {
    delete mongoose.models.HostelAnalytics;
}

export const HostelAnalytics: Model<IHostelAnalytics> = mongoose.model<IHostelAnalytics>(
    "HostelAnalytics",
    hostelAnalyticsSchema
);
