import mongoose, { Document, Model, Schema } from "mongoose";

export interface IBusinessStock extends Document {
  name: string;
  currentQuantity: number;
  unit?: string;
  businessId: string;
  createdAt: Date;
  updatedAt: Date;
}

const businessStockSchema = new Schema<IBusinessStock>(
  {
    name: { type: String, required: true },
    currentQuantity: { type: Number, default: 0 },
    unit: { type: String },
    businessId: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

businessStockSchema.index({ businessId: 1, name: 1 }, { unique: true });

export const BusinessStock: Model<IBusinessStock> =
  mongoose.models.BusinessStock || mongoose.model<IBusinessStock>("BusinessStock", businessStockSchema);
