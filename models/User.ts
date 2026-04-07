import mongoose, { Document, Model, Schema } from "mongoose";

export interface IUserSubscription {
    module: "pool" | "hostel";
    planType: "trial" | "quarterly" | "yearly" | "block-based";
    blocks?: 1 | 2 | 3 | 4;   // hostel block-based only
    pricePaid: number;
    startDate: Date;
    expiryDate: Date;
    status: "active" | "expired";
}

export interface IUser extends Document {
    name: string;
    email: string;
    passwordHash: string;
    role: "superadmin" | "admin" | "operator" | "hostel_admin";
    phone?: string;
    poolId?: string;
    hostelId?: string;   // hostel tenant scope — coexists with poolId
    isActive: boolean;
    lastLogin?: Date;
    // ── SaaS Subscription ────────────────────────────────────────────────
    subscription?: IUserSubscription;
    trial?: {
        isUsed: boolean;   // guard flag — prevents second trial
    };
    createdAt: Date;
    updatedAt: Date;
}

const subscriptionSubSchema = new Schema<IUserSubscription>(
    {
        module:    { type: String, enum: ["pool", "hostel"], required: true },
        planType:  { type: String, enum: ["trial", "quarterly", "yearly", "block-based"], required: true },
        blocks:    { type: Number, enum: [1, 2, 3, 4] },
        pricePaid: { type: Number, required: true, min: 0 },
        startDate: { type: Date, required: true },
        expiryDate:{ type: Date, required: true },
        status:    { type: String, enum: ["active", "expired"], default: "active" },
    },
    { _id: false }
);

const userSchema = new Schema<IUser>(
    {
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        passwordHash: { type: String, required: true },
        poolId: { type: String, index: true, sparse: true },
        hostelId: { type: String, index: true, sparse: true },
        role: {
            type: String,
            enum: ["superadmin", "admin", "operator", "hostel_admin"],
            default: "operator",
        },
        isActive: { type: Boolean, default: true },
        lastLogin: { type: Date },
        phone: { type: String },
        // ── SaaS Subscription ──────────────────────────────────────────
        subscription: { type: subscriptionSubSchema },
        trial: {
            isUsed: { type: Boolean, default: false },
        },
    },
    { timestamps: true }
);

userSchema.index({ name: 1 });
userSchema.index({ email: 1, poolId: 1 });
userSchema.index({ name: 1, poolId: 1 });
userSchema.index({ poolId: 1, role: 1 });
// Performance index for subscription cron
userSchema.index({ "subscription.expiryDate": 1 });
userSchema.index({ "subscription.status": 1, "subscription.expiryDate": 1 });

export const User: Model<IUser> =
    mongoose.models.User || mongoose.model<IUser>("User", userSchema);
