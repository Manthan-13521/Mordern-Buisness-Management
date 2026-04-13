import mongoose, { Document, Model, Schema } from "mongoose";

export interface IBusinessLabourPayment extends Document {
  labourId: mongoose.Types.ObjectId;
  amount: number;
  businessId: string;
  createdAt: Date;
  updatedAt: Date;
}

const businessLabourPaymentSchema = new Schema<IBusinessLabourPayment>(
  {
    labourId: { type: Schema.Types.ObjectId, ref: "BusinessLabour", required: true, index: true },
    amount: { type: Number, required: true },
    businessId: { type: String, required: true, index: true }
  },
  { timestamps: true }
);

businessLabourPaymentSchema.index({ businessId: 1, createdAt: -1 });

export const BusinessLabourPayment: Model<IBusinessLabourPayment> =
  mongoose.models.BusinessLabourPayment || mongoose.model<IBusinessLabourPayment>("BusinessLabourPayment", businessLabourPaymentSchema);
