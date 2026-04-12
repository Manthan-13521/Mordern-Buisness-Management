import mongoose, { Document, Model, Schema } from "mongoose";

export interface IPoolStats extends Document {
    poolId: string;
    totalMembers: number;
    totalEntertainmentMembers: number;
    isInitialized: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const poolStatsSchema = new Schema<IPoolStats>(
    {
        poolId: { type: String, required: true, unique: true, index: true },
        totalMembers: { type: Number, default: 0 },
        totalEntertainmentMembers: { type: Number, default: 0 },
        isInitialized: { type: Boolean, default: false },
    },
    { timestamps: true }
);

export const PoolStats: Model<IPoolStats> =
    mongoose.models.PoolStats || mongoose.model<IPoolStats>("PoolStats", poolStatsSchema);
