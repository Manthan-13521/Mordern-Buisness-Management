import mongoose, { Document, Model, Schema } from "mongoose";

export interface INotificationLog extends Document {
    memberId: mongoose.Types.ObjectId;
    poolId?: string;
    module: "pool" | "hostel";
    actionType?: string;
    type: "whatsapp" | "sms" | "email";
    message: string;
    status: "sent" | "failed" | "failed_permanent";
    errorDetails?: string;
    dateKey?: string; // YYYY-MM-DD for idempotent dedup
    date: Date;
    sentAt?: Date;
}

const notificationLogSchema = new Schema<INotificationLog>(
    {
        memberId: { type: Schema.Types.ObjectId, ref: "Member", required: true },
        poolId: { type: String, required: true, index: true },
        module: { type: String, enum: ["pool", "hostel"], required: true, default: "pool" },
        actionType: { type: String },
        type: { type: String, enum: ["whatsapp", "sms", "email"], required: true },
        message: { type: String, required: true },
        status: { type: String, enum: ["sent", "failed", "failed_permanent"], required: true },
        errorDetails: { type: String },
        dateKey: { type: String, index: true },
        date: { type: Date, default: Date.now, index: true },
        sentAt: { type: Date, index: true },
    },
    { timestamps: true }
);

// Section 2D — performance indexes
notificationLogSchema.index({ memberId: 1 });
notificationLogSchema.index({ date: -1 });  // sentAt equivalent
notificationLogSchema.index({ status: 1 });
// TTL: auto-delete logs older than 10 days
notificationLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 864000 });
// Step 10: Idempotent dedup — one notification per member per action per day
notificationLogSchema.index({ memberId: 1, actionType: 1, dateKey: 1 }, { unique: true, sparse: true });

export const NotificationLog: Model<INotificationLog> =
    mongoose.models.NotificationLog || mongoose.model<INotificationLog>("NotificationLog", notificationLogSchema);
