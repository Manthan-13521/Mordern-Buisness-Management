import mongoose, { Document, Model, Schema } from "mongoose";

export interface IStaffAdvance extends Document {
  staffId: mongoose.Types.ObjectId;
  poolId: string;
  month: string; // Format: YYYY-MM
  amount: number;
  createdAt: Date;
  updatedAt: Date;
}

const staffAdvanceSchema = new Schema<IStaffAdvance>(
  {
    staffId: { type: Schema.Types.ObjectId, ref: "Staff", required: true, index: true },
    poolId: { type: String, required: true, index: true },
    month: { type: String, required: true, index: true },
    amount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

staffAdvanceSchema.index({ staffId: 1, month: 1 }, { unique: true });

export const StaffAdvance: Model<IStaffAdvance> =
  mongoose.models.StaffAdvance || mongoose.model<IStaffAdvance>("StaffAdvance", staffAdvanceSchema);
