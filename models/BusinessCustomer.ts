import mongoose, { Document, Model, Schema } from "mongoose";

export interface IBusinessCustomer extends Document {
  name: string;
  phone?: string;
  businessName?: string;
  gstNumber?: string;
  address?: string;
  totalPurchase: number;
  totalPaid: number;
  currentDue: number;
  businessId: string;
  createdAt: Date;
  updatedAt: Date;
}

const businessCustomerSchema = new Schema<IBusinessCustomer>(
  {
    name: { type: String, required: true },
    phone: { type: String },
    businessName: { type: String },
    gstNumber: { type: String },
    address: { type: String },
    totalPurchase: { type: Number, default: 0 },
    totalPaid: { type: Number, default: 0 },
    currentDue: { type: Number, default: 0 },
    businessId: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

businessCustomerSchema.index({ businessId: 1, name: 1 });
businessCustomerSchema.index({ businessId: 1, currentDue: -1 });

export const BusinessCustomer: Model<IBusinessCustomer> =
  mongoose.models.BusinessCustomer || mongoose.model<IBusinessCustomer>("BusinessCustomer", businessCustomerSchema);
