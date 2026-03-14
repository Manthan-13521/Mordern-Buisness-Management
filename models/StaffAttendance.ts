import mongoose, { Document, Model, Schema } from "mongoose";

export interface IStaffAttendance extends Document {
    staffId: string;
    poolId: string;
    timestamp: Date;
    method: "qr" | "face_scan" | "manual";
    type: "clock_in" | "clock_out";
}

const staffAttendanceSchema = new Schema<IStaffAttendance>(
    {
        staffId: { type: String, required: true, index: true },
        poolId: { type: String, required: true, index: true },
        timestamp: { type: Date, default: Date.now, index: true },
        method: { type: String, enum: ["qr", "face_scan", "manual"], required: true },
        type: { type: String, enum: ["clock_in", "clock_out"], required: true },
    },
    { timestamps: true }
);

export const StaffAttendance: Model<IStaffAttendance> =
    mongoose.models.StaffAttendance || mongoose.model<IStaffAttendance>("StaffAttendance", staffAttendanceSchema);
