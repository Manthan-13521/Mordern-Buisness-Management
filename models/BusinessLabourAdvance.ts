import mongoose, { Document, Model, Schema } from "mongoose";

export interface IBusinessLabourAdvance extends Document {
  labourId: mongoose.Types.ObjectId;
  businessId: string;
  month: string; // Format: YYYY-MM
  amount: number;
  createdAt: Date;
  updatedAt: Date;
}

const businessLabourAdvanceSchema = new Schema<IBusinessLabourAdvance>(
  {
    labourId: { type: Schema.Types.ObjectId, ref: "BusinessLabour", required: true, index: true },
    businessId: { type: String, required: true, index: true },
    month: { type: String, required: true, index: true },
    amount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Unique index to ensure only one advance record per staff per month per business
businessLabourAdvanceSchema.index({ businessId: 1, labourId: 1, month: 1 }, { unique: true });

export const BusinessLabourAdvance: Model<IBusinessLabourAdvance> =
  mongoose.models.BusinessLabourAdvance || mongoose.model<IBusinessLabourAdvance>("BusinessLabourAdvance", businessLabourAdvanceSchema);
