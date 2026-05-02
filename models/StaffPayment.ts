import mongoose, { Document, Model, Schema } from "mongoose";

export interface IStaffPayment extends Document {
  staffId: mongoose.Types.ObjectId;
  amount: number;
  poolId: string;
  createdAt: Date;
  updatedAt: Date;
}

const staffPaymentSchema = new Schema<IStaffPayment>(
  {
    staffId: { type: Schema.Types.ObjectId, ref: "Staff", required: true, index: true },
    amount: { type: Number, required: true },
    poolId: { type: String, required: true, index: true }
  },
  { timestamps: true }
);

staffPaymentSchema.index({ poolId: 1, createdAt: -1 });

export const StaffPayment: Model<IStaffPayment> =
  mongoose.models.StaffPayment || mongoose.model<IStaffPayment>("StaffPayment", staffPaymentSchema);
