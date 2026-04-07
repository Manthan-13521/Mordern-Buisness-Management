import mongoose, { Document, Model, Schema } from "mongoose";

export interface IHostelStaffAttendance extends Document {
    hostelId: string;
    staffId: string;
    date: string; // YYYY-MM-DD
    checkInTime?: Date;
    checkOutTime?: Date;
    status: "Present" | "Absent";
    createdAt: Date;
    updatedAt: Date;
}

const hostelStaffAttendanceSchema = new Schema<IHostelStaffAttendance>(
    {
        hostelId:     { type: String, required: true, index: true },
        staffId:      { type: String, required: true, index: true },
        date:         { type: String, required: true, index: true },
        checkInTime:  { type: Date },
        checkOutTime: { type: Date },
        status:       { type: String, enum: ["Present", "Absent"], default: "Present" },
    },
    { timestamps: true }
);

// One unique attendance per staff per day
hostelStaffAttendanceSchema.index({ hostelId: 1, staffId: 1, date: 1 }, { unique: true });

export const HostelStaffAttendance: Model<IHostelStaffAttendance> =
    mongoose.models.HostelStaffAttendance ||
    mongoose.model<IHostelStaffAttendance>("HostelStaffAttendance", hostelStaffAttendanceSchema);
