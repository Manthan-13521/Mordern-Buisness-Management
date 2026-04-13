import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISystemLock extends Document {
    key: string;
    expiresAt: Date;
}

const SystemLockSchema = new Schema<ISystemLock>({
    key: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true }
}, { timestamps: true });

// TTL index to automatically purge expired locks
SystemLockSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const SystemLock: Model<ISystemLock> = 
    mongoose.models.SystemLock || mongoose.model<ISystemLock>("SystemLock", SystemLockSchema);
