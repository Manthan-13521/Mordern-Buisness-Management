import mongoose, { Document, Model, Schema } from "mongoose";

export interface IUnifiedUser extends Document {
    organizationId?: string;
    originalId: string; // The Member or HostelMember ID
    name: string;
    phone: string;
    type: "pool" | "hostel" | "student" | "entertainment";
    accessState: "active" | "blocked" | "suspended";
    cachedBalance: number;
    createdAt: Date;
    updatedAt: Date;
}

const unifiedUserSchema = new Schema<IUnifiedUser>(
    {
        organizationId: { type: String, index: true },
        originalId: { type: String, required: true, index: true, unique: true },
        name: { type: String },
        phone: { type: String, index: true },
        type: { 
            type: String, 
            enum: ["pool", "hostel", "student", "entertainment"],
            required: true,
            index: true
        },
        accessState: {
            type: String,
            default: "active",
            index: true
        },
        cachedBalance: { type: Number, default: 0 },
    },
    { timestamps: true }
);

unifiedUserSchema.index({ organizationId: 1, type: 1 });
unifiedUserSchema.index({ phone: 1, type: 1 });

export const UnifiedUser: Model<IUnifiedUser> =
    mongoose.models.UnifiedUser || mongoose.model<IUnifiedUser>("UnifiedUser", unifiedUserSchema);
