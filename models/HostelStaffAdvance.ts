import mongoose, { Document, Model, Schema } from "mongoose";

export interface IHostelStaffAdvance extends Document {
  staffId: mongoose.Types.ObjectId;
  hostelId: string;
  month: string; // Format: YYYY-MM
  amount: number;
  createdAt: Date;
  updatedAt: Date;
}

const hostelStaffAdvanceSchema = new Schema<IHostelStaffAdvance>(
  {
    staffId: { type: Schema.Types.ObjectId, ref: "HostelStaff", required: true, index: true },
    hostelId: { type: String, required: true, index: true },
    month: { type: String, required: true, index: true },
    amount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

hostelStaffAdvanceSchema.index({ staffId: 1, month: 1 }, { unique: true });

export const HostelStaffAdvance: Model<IHostelStaffAdvance> =
  mongoose.models.HostelStaffAdvance || mongoose.model<IHostelStaffAdvance>("HostelStaffAdvance", hostelStaffAdvanceSchema);
