import mongoose, { Document, Model, Schema } from "mongoose";

export interface IBusinessAttendance extends Document {
  labourId: mongoose.Types.ObjectId;
  date: Date;
  status: "present" | "half_day" | "absent";
  businessId: string;
  createdAt: Date;
  updatedAt: Date;
}

const businessAttendanceSchema = new Schema<IBusinessAttendance>(
  {
    labourId: { type: Schema.Types.ObjectId, ref: "BusinessLabour", required: true, index: true },
    date: { type: Date, required: true, index: true },
    status: { type: String, enum: ["present", "half_day", "absent"], required: true },
    businessId: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

businessAttendanceSchema.index({ businessId: 1, date: -1 });
businessAttendanceSchema.index({ labourId: 1, date: 1 }, { unique: true });

export const BusinessAttendance: Model<IBusinessAttendance> =
  mongoose.models.BusinessAttendance || mongoose.model<IBusinessAttendance>("BusinessAttendance", businessAttendanceSchema);
