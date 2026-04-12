import mongoose, { Document, Model, Schema } from "mongoose";

export interface IBusinessPayment extends Document {
  customerId: mongoose.Types.ObjectId;
  amount: number;
  type: "cash" | "upi";
  fileUrl?: string; // Receipt upload
  paymentType: "paid" | "received";
  businessId: string;
  date: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const businessPaymentSchema = new Schema<IBusinessPayment>(
  {
    customerId: { type: Schema.Types.ObjectId, ref: "BusinessCustomer", required: true, index: true },
    amount: { type: Number, required: true },
    type: { type: String, enum: ["cash", "upi"], required: true },
    fileUrl: { type: String },
    paymentType: { type: String, enum: ["paid", "received"], required: true },
    businessId: { type: String, required: true, index: true },
    date: { type: Date, default: Date.now, index: true },
    notes: { type: String },
  },
  { timestamps: true }
);

businessPaymentSchema.index({ businessId: 1, date: -1 });

export const BusinessPayment: Model<IBusinessPayment> =
  mongoose.models.BusinessPayment || mongoose.model<IBusinessPayment>("BusinessPayment", businessPaymentSchema);
