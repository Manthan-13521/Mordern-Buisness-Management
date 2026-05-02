import mongoose, { Document, Model, Schema } from "mongoose";

export interface IHostelStaffPayment extends Document {
  staffId: mongoose.Types.ObjectId;
  amount: number;
  hostelId: string;
  createdAt: Date;
  updatedAt: Date;
}

const hostelStaffPaymentSchema = new Schema<IHostelStaffPayment>(
  {
    staffId: { type: Schema.Types.ObjectId, ref: "HostelStaff", required: true, index: true },
    amount: { type: Number, required: true },
    hostelId: { type: String, required: true, index: true }
  },
  { timestamps: true }
);

hostelStaffPaymentSchema.index({ hostelId: 1, createdAt: -1 });

export const HostelStaffPayment: Model<IHostelStaffPayment> =
  mongoose.models.HostelStaffPayment || mongoose.model<IHostelStaffPayment>("HostelStaffPayment", hostelStaffPaymentSchema);
