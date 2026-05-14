import mongoose, { Document, Model, Schema } from "mongoose";

export interface ISystemStats extends Document {
  month: string; // "YYYY-MM" format for easy unique indexing
  poolUsers: number;
  hostelUsers: number;
  businessUsers: number;
  activeUsers: number;
  updatedAt: Date;
}

const systemStatsSchema = new Schema<ISystemStats>(
  {
    month: { type: String, required: true, unique: true },
    poolUsers: { type: Number, default: 0 },
    hostelUsers: { type: Number, default: 0 },
    businessUsers: { type: Number, default: 0 },
    activeUsers: { type: Number, default: 0 },
    referralUses: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const SystemStats: Model<ISystemStats> =
  mongoose.models.SystemStats || mongoose.model<ISystemStats>("SystemStats", systemStatsSchema);
