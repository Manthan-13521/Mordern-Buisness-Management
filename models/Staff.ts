import mongoose, { Document, Model, Schema } from "mongoose";

export interface IStaff extends Document {
    staffId: string;
    poolId: string;
    name: string;
    phone: string;
    role: "Trainer" | "Manager" | "Staff";
    faceScanEnabled?: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const staffSchema = new Schema<IStaff>(
    {
        staffId: { type: String, required: true, unique: true, index: true },
        poolId: { type: String, required: true, index: true },
        name: { type: String, required: true },
        phone: { type: String, required: true },
        role: { type: String, enum: ["Trainer", "Manager", "Staff"], required: true },
        faceScanEnabled: { type: Boolean, default: false },
    },
    { timestamps: true }
);

export const Staff: Model<IStaff> =
    mongoose.models.Staff || mongoose.model<IStaff>("Staff", staffSchema);
