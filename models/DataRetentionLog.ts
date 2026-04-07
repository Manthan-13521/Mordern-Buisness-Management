import mongoose, { Document, Model, Schema } from "mongoose";

export interface IDataRetentionLog extends Document {
    deletedType: "payment" | "member" | "log" | "hostel_registration" | "hostel_payment";
    countDeleted: number;
    deletedAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const dataRetentionLogSchema = new Schema<IDataRetentionLog>(
    {
        deletedType: {
            type: String,
            enum: ["payment", "member", "log", "hostel_registration", "hostel_payment"],
            required: true,
        },
        countDeleted: {
            type: Number,
            required: true,
            default: 0,
        },
        deletedAt: {
            type: Date,
            default: Date.now,
            required: true,
        },
    },
    { timestamps: true }
);

dataRetentionLogSchema.index({ deletedType: 1, deletedAt: -1 });
dataRetentionLogSchema.index({ createdAt: -1 });

export const DataRetentionLog: Model<IDataRetentionLog> =
    mongoose.models.DataRetentionLog ||
    mongoose.model<IDataRetentionLog>("DataRetentionLog", dataRetentionLogSchema);
