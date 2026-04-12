import mongoose, { Document, Model, Schema } from "mongoose";

export interface IHostelStats extends Document {
    hostelId: string;
    totalMembers: number;
    totalJoinedThisYear: number;
    isInitialized: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const hostelStatsSchema = new Schema<IHostelStats>(
    {
        hostelId: { type: String, required: true, index: true, unique: true },
        totalMembers: { type: Number, default: 0 },
        totalJoinedThisYear: { type: Number, default: 0 },
        isInitialized: { type: Boolean, default: false }
    },
    { timestamps: true }
);

if (mongoose.models.HostelStats) {
    delete mongoose.models.HostelStats;
}

export const HostelStats: Model<IHostelStats> = mongoose.model<IHostelStats>("HostelStats", hostelStatsSchema);
