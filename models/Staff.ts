import mongoose, { Document, Model, Schema } from "mongoose";

export interface IStaff extends Document {
    staffId: string;
    poolId: string;
    name: string;
    phone?: string;
    role: "Trainer" | "Lifeguard" | "Cleaner" | "Manager" | "Staff" | "Other";
    salary: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const staffSchema = new Schema<IStaff>(
    {
        staffId: { type: String, required: true, unique: true, index: true },
        poolId: { type: String, required: true, index: true },
        name: { type: String, required: true },
        phone: { type: String },
        role: { type: String, required: true },
        salary: { type: Number, default: 0 },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

export const Staff: Model<IStaff> =
    mongoose.models.Staff || mongoose.model<IStaff>("Staff", staffSchema);
