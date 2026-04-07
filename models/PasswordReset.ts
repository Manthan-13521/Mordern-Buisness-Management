import mongoose, { Document, Model, Schema } from "mongoose";

export interface IPasswordReset extends Document {
    userId: mongoose.Types.ObjectId;
    email: string; // always the DB-matched email, never frontend input
    otpHash: string;
    expiresAt: Date;
    attempts: number;
    createdAt: Date;
}

const passwordResetSchema = new Schema<IPasswordReset>(
    {
        userId:    { type: Schema.Types.ObjectId, ref: "User", required: true },
        email:     { type: String, required: true, lowercase: true },
        otpHash:   { type: String, required: true },
        expiresAt: { type: Date, required: true },
        attempts:  { type: Number, default: 0 },
    },
    { timestamps: true }
);

// One active reset per user — ensures resend invalidates old OTP
passwordResetSchema.index({ userId: 1 }, { unique: true });
passwordResetSchema.index({ email: 1 });

// TTL auto-cleanup: MongoDB deletes expired docs automatically
passwordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PasswordReset: Model<IPasswordReset> =
    mongoose.models.PasswordReset ||
    mongoose.model<IPasswordReset>("PasswordReset", passwordResetSchema);
