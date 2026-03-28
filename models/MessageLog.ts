import mongoose, { Document, Model, Schema } from "mongoose";

export interface IMessageLog extends Document {
    poolId: string;
    memberId: mongoose.Types.ObjectId;
    phone: string;
    type: "before_expiry" | "after_expiry";
    message: string;
    mediaUrl?: string;
    status: "sent" | "failed";
    error?: string;
    createdAt: Date;
}

const messageLogSchema = new Schema<IMessageLog>(
    {
        poolId:   { type: String, required: true, index: true },
        memberId: { type: Schema.Types.ObjectId, ref: "Member", required: true, index: true },
        phone:    { type: String, required: true },
        type: {
            type: String,
            enum: ["before_expiry", "after_expiry"],
            required: true,
        },
        message:  { type: String, required: true },
        mediaUrl: { type: String },
        status:   { type: String, enum: ["sent", "failed"], required: true },
        error:    { type: String },
    },
    { timestamps: true }
);

// Compound indexes for dedup checks and log queries
messageLogSchema.index({ memberId: 1, type: 1, createdAt: -1 });
messageLogSchema.index({ poolId: 1, createdAt: -1 });
messageLogSchema.index({ status: 1 });

// TTL: auto-delete logs older than 6 months
messageLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 15_552_000 });

export const MessageLog: Model<IMessageLog> =
    mongoose.models.MessageLog ||
    mongoose.model<IMessageLog>("MessageLog", messageLogSchema);
