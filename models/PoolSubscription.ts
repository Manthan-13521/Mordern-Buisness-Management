import mongoose, { Document, Model, Schema } from "mongoose";

export interface IPoolSubscription extends Document {
    poolId: string;
    planName: "Starter" | "Pro" | "Enterprise";
    price: number;
    startDate: Date;
    expiryDate: Date;
    status: "active" | "expired" | "cancelled";
    createdAt: Date;
    updatedAt: Date;
}

const poolSubscriptionSchema = new Schema<IPoolSubscription>(
    {
        poolId: { type: String, required: true, index: true },
        planName: { type: String, enum: ["Starter", "Pro", "Enterprise"], required: true },
        price: { type: Number, required: true },
        startDate: { type: Date, required: true, default: Date.now },
        expiryDate: { type: Date, required: true },
        status: { type: String, enum: ["active", "expired", "cancelled"], default: "active", index: true },
    },
    { timestamps: true }
);

export const PoolSubscription: Model<IPoolSubscription> =
    mongoose.models.PoolSubscription || mongoose.model<IPoolSubscription>("PoolSubscription", poolSubscriptionSchema);
