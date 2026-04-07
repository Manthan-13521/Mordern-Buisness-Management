import mongoose, { Document, Model, Schema } from "mongoose";

export interface ISaaSPlan extends Document {
    name: string;
    price: number;
    maxMembers: number;
    maxStaff?: number;
    features: {
        analytics: boolean;
        whatsapp: boolean;
        autoBlock: boolean;
        prioritySupport: boolean;
    };
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const saasPlanSchema = new Schema<ISaaSPlan>(
    {
        name: { type: String, required: true, unique: true },
        price: { type: Number, required: true, min: 0 },
        maxMembers: { type: Number, required: true },
        maxStaff: { type: Number, default: 5 },
        features: {
            analytics: { type: Boolean, default: false },
            whatsapp: { type: Boolean, default: false },
            autoBlock: { type: Boolean, default: false },
            prioritySupport: { type: Boolean, default: false },
        },
        isActive: { type: Boolean, default: true }
    },
    { timestamps: true }
);

export const SaaSPlan: Model<ISaaSPlan> =
    mongoose.models.SaaSPlan || mongoose.model<ISaaSPlan>("SaaSPlan", saasPlanSchema);
