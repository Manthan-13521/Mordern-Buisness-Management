import mongoose, { Document, Model, Schema } from "mongoose";

export type HostelPaymentType = "initial" | "renewal" | "balance" | "refund" | "settlement" | "rent";

export interface IHostelPaymentLog extends Document {
  hostelId: string;
  memberId: string;
  memberName: string;
  amount: number;
  paymentType: HostelPaymentType;
  payment_date: Date;
  createdBy: string;
  createdAt: Date;
}

const hostelPaymentLogSchema = new Schema<IHostelPaymentLog>(
  {
    hostelId: { type: String, required: true, index: true },
    memberId: { type: String, required: true },
    memberName: { type: String, required: true },
    amount: { type: Number, required: true },
    paymentType: {
      type: String,
      enum: ["initial", "renewal", "balance", "refund", "settlement", "rent"],
      required: true,
    },
    payment_date: { type: Date, required: true },
    createdBy: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

hostelPaymentLogSchema.index({ hostelId: 1, payment_date: -1 });
hostelPaymentLogSchema.index({ hostelId: 1, createdAt: -1 });

export const HostelPaymentLog: Model<IHostelPaymentLog> =
  mongoose.models.HostelPaymentLog ||
  mongoose.model<IHostelPaymentLog>("HostelPaymentLog", hostelPaymentLogSchema);
