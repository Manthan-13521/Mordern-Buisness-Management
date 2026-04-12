import mongoose, { Document, Model, Schema } from "mongoose";

export interface ICronLog extends Document {
    jobName: string;
    status: "success" | "failed" | "running";
    error?: string;
    runAt: Date;
    completedAt?: Date;
    metadata?: any;
}

const cronLogSchema = new Schema<ICronLog>(
    {
        jobName: { type: String, required: true, index: true },
        status: { type: String, enum: ["success", "failed", "running"], required: true },
        error: { type: String },
        runAt: { type: Date, default: Date.now, index: true },
        completedAt: { type: Date },
        metadata: { type: Schema.Types.Mixed },
    },
    { timestamps: true }
);

export const CronLog: Model<ICronLog> =
    mongoose.models.CronLog || mongoose.model<ICronLog>("CronLog", cronLogSchema);
