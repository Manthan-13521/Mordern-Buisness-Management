import mongoose, { Document, Model, Schema } from "mongoose";

export interface IPool extends Document {
    poolId: string;
    poolName: string;
    slug: string;
    adminEmail: string;
    capacity: number;
    location?: string;
    status: "ACTIVE" | "SUSPENDED" | "INACTIVE";
    branding?: {
        logoUrl?: string;
        themeColor?: string;
        contactDetails?: string;
    };
    createdAt: Date;
    updatedAt: Date;
}

const poolSchema = new Schema<IPool>(
    {
        poolId: { type: String, required: true, unique: true, index: true },
        poolName: { type: String, required: true },
        slug: { type: String, required: true, unique: true, index: true },
        adminEmail: { type: String, required: true },
        capacity: { type: Number, required: true, default: 100 },
        location: { type: String },
        status: { type: String, enum: ["ACTIVE", "SUSPENDED", "INACTIVE"], default: "ACTIVE" },
        branding: {
            logoUrl: { type: String },
            themeColor: { type: String, default: "#000000" },
            contactDetails: { type: String },
        }
    },
    { timestamps: true }
);

export const Pool: Model<IPool> =
    mongoose.models.Pool || mongoose.model<IPool>("Pool", poolSchema);
