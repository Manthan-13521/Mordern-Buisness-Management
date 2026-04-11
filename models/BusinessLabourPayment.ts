import mongoose, { Document, Model, Schema } from "mongoose";

export interface IBusinessLabourPayment extends Document {
  labourId: mongoose.Types.ObjectId;
  amount: number;
  paymentType: "paid" | "advance";
  businessId: string;
  date: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const businessLabourPaymentSchema = new Schema<IBusinessLabourPayment>(
  {
    labourId: { type: Schema.Types.ObjectId, ref: "BusinessLabour", required: true, index: true },
    amount: { type: Number, required: true },
    paymentType: { type: String, enum: ["paid", "advance"], default: "paid" },
    businessId: { type: String, required: true, index: true },
    date: { type: Date, default: Date.now, index: true },
    notes: { type: String },
  },
  { timestamps: true }
);

businessLabourPaymentSchema.index({ businessId: 1, date: -1 });

export const BusinessLabourPayment: Model<IBusinessLabourPayment> =
  mongoose.models.BusinessLabourPayment || mongoose.model<IBusinessLabourPayment>("BusinessLabourPayment", businessLabourPaymentSchema);

