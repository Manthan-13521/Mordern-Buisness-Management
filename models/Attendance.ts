import mongoose, { Document, Model, Schema } from "mongoose";

export interface IAttendance extends Document {
    poolId: string;
    userId: mongoose.Types.ObjectId;
    role: "staff" | "trainer" | "manager";
    date: Date;
    checkIn?: Date;
    checkOut?: Date;
    status: "present" | "absent" | "late";
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

const attendanceSchema = new Schema<IAttendance>(
    {
        poolId: { type: String, required: true, index: true },
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        role: {
            type: String,
            enum: ["staff", "trainer", "manager"],
            required: true,
        },
        date: { type: Date, required: true },
        checkIn: { type: Date },
        checkOut: { type: Date },
        status: {
            type: String,
            enum: ["present", "absent", "late"],
            default: "present",
        },
        notes: { type: String },
    },
    { timestamps: true }
);

attendanceSchema.index({ poolId: 1, date: -1 });
attendanceSchema.index({ poolId: 1, userId: 1, date: -1 });

export const Attendance: Model<IAttendance> =
    mongoose.models.Attendance ||
    mongoose.model<IAttendance>("Attendance", attendanceSchema);
