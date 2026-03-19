import mongoose, { Document, Model, Schema } from "mongoose";

export interface IWaterQualityLog extends Document {
    poolId: string;
    recordedBy: mongoose.Types.ObjectId;
    ph: number;
    chlorine: number;
    temperature: number;
    turbidity?: number;
    alkalinity?: number;
    hardness?: number;
    status: "safe" | "warning" | "critical";
    notes?: string;
    recordedAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const waterQualityLogSchema = new Schema<IWaterQualityLog>(
    {
        poolId: { type: String, required: true, index: true },
        recordedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        ph: { type: Number, required: true, min: 0, max: 14 },
        chlorine: { type: Number, required: true, min: 0 },
        temperature: { type: Number, required: true },
        turbidity: { type: Number, min: 0 },
        alkalinity: { type: Number, min: 0 },
        hardness: { type: Number, min: 0 },
        status: {
            type: String,
            enum: ["safe", "warning", "critical"],
            required: true,
        },
        notes: { type: String },
        recordedAt: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

waterQualityLogSchema.index({ poolId: 1, recordedAt: -1 });

export const WaterQualityLog: Model<IWaterQualityLog> =
    mongoose.models.WaterQualityLog ||
    mongoose.model<IWaterQualityLog>("WaterQualityLog", waterQualityLogSchema);
