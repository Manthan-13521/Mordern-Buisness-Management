import mongoose, { Document, Model, Schema } from "mongoose";

export interface IStaffAttendance extends Document {
    staffId: string;
    poolId: string;
    timestamp: Date;
    method: "qr" | "face_scan" | "manual";
    type: "clock_in" | "clock_out" | "checkIn" | "checkOut";
    date?: string;
    status?: string;
}

const staffAttendanceSchema = new Schema<IStaffAttendance>(
    {
        staffId: { type: String, required: true, index: true },
        poolId: { type: String, required: true, index: true },
        timestamp: { type: Date, default: Date.now, index: true },
        method: { type: String, enum: ["qr", "face_scan", "manual"], required: true },
        type: { type: String, enum: ["clock_in", "clock_out", "checkIn", "checkOut"], required: true },
        date: { type: String },
        status: { type: String },
    },
    { timestamps: true }
);

// Compound index for the $lookup aggregation in staff route (staffId + poolId + timestamp sort)
staffAttendanceSchema.index({ staffId: 1, poolId: 1, timestamp: -1 });

// Force re-registration so the updated enum takes effect even if model was cached
if (mongoose.models.StaffAttendance) {
    delete mongoose.models.StaffAttendance;
}

export const StaffAttendance: Model<IStaffAttendance> =
    mongoose.model<IStaffAttendance>("StaffAttendance", staffAttendanceSchema);

