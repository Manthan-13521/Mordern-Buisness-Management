import mongoose, { Document, Model, Schema } from "mongoose";

export interface IHostelStaff extends Document {
    staffId?: string;
    hostelId: string;
    name: string;
    phone?: string;
    role: "Worker" | "Staff" | "Cook" | "Guard" | "Cleaner" | "Warden" | "Security" | "Other";
    salary?: number;
    joiningDate?: Date;
    isActive: boolean;
    // Block assignment (added for global block filter support)
    blockId?: mongoose.Types.ObjectId;
    blockName?: string;
    createdAt: Date;
    updatedAt: Date;
}

const hostelStaffSchema = new Schema<IHostelStaff>(
    {
        staffId:     { type: String, required: true, unique: true, index: true },
        hostelId:    { type: String, required: true, index: true },
        name:        { type: String, required: true },
        phone:       { type: String },
        role:        { type: String, required: true },
        salary:      { type: Number, default: 0 },
        joiningDate: { type: Date },
        isActive:    { type: Boolean, default: true },
        // Block fields — optional for backward-compat with existing staff records
        blockId:     { type: Schema.Types.ObjectId, ref: "HostelBlock", index: true },
        blockName:   { type: String },
    },
    { timestamps: true }
);

hostelStaffSchema.index({ hostelId: 1, staffId: 1 }, { unique: true });
hostelStaffSchema.index({ hostelId: 1, role: 1 });
hostelStaffSchema.index({ hostelId: 1, blockId: 1 });

export const HostelStaff: Model<IHostelStaff> =
    mongoose.models.HostelStaff ||
    mongoose.model<IHostelStaff>("HostelStaff", hostelStaffSchema);
