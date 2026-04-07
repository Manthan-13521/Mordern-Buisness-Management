import mongoose, { Document, Model, Schema } from "mongoose";

export interface IFailedJob extends Document {
    jobType: string;
    payload: any;
    error: string;
    retryCount: number;
    createdAt: Date;
    updatedAt: Date;
}

const failedJobSchema = new Schema<IFailedJob>(
    {
        jobType: { type: String, required: true, index: true },
        payload: { type: Schema.Types.Mixed },
        error: { type: String, required: true },
        retryCount: { type: Number, default: 0 },
    },
    { timestamps: true }
);

export const FailedJob: Model<IFailedJob> =
    mongoose.models.FailedJob || mongoose.model<IFailedJob>("FailedJob", failedJobSchema);
