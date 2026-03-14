import mongoose, { Document, Model, Schema } from "mongoose";

export interface IWaterMetric extends Document {
    poolId: string;
    phLevel: number;
    temperature: number;
    chlorineLevel: number;
    recordedAt: Date;
}

const waterMetricSchema = new Schema<IWaterMetric>(
    {
        poolId: { type: String, required: true, index: true },
        phLevel: { type: Number, required: true },
        temperature: { type: Number, required: true },
        chlorineLevel: { type: Number, required: true },
        recordedAt: { type: Date, default: Date.now, index: true },
    },
    { timestamps: true }
);

export const WaterMetric: Model<IWaterMetric> =
    mongoose.models.WaterMetric || mongoose.model<IWaterMetric>("WaterMetric", waterMetricSchema);
