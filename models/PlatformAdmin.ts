import mongoose, { Document, Model, Schema } from "mongoose";

export interface IPlatformAdmin extends Document {
    email: string;
    passwordHash: string;
    role: "superadmin";
    createdAt: Date;
    updatedAt: Date;
}

const platformAdminSchema = new Schema<IPlatformAdmin>(
    {
        email: { type: String, required: true, unique: true },
        passwordHash: { type: String, required: true },
        role: { type: String, enum: ["superadmin"], default: "superadmin" },
    },
    { timestamps: true }
);

export const PlatformAdmin: Model<IPlatformAdmin> =
    mongoose.models.PlatformAdmin || mongoose.model<IPlatformAdmin>("PlatformAdmin", platformAdminSchema);
