import mongoose, { Document, Model, Schema } from "mongoose";

export interface ISaleItem {
  name: string;
  qty: number;
  price: number;
}

export interface IBusinessSale extends Document {
  customerId: mongoose.Types.ObjectId;
  items: ISaleItem[];
  transportationCost: number;
  totalAmount: number;
  businessId: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const saleItemSchema = new Schema<ISaleItem>(
  {
    name: { type: String, required: true },
    qty: { type: Number, required: true },
    price: { type: Number, required: true },
  },
  { _id: false }
);

const businessSaleSchema = new Schema<IBusinessSale>(
  {
    customerId: { type: Schema.Types.ObjectId, ref: "BusinessCustomer", required: true, index: true },
    items: [saleItemSchema],
    transportationCost: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    businessId: { type: String, required: true, index: true },
    date: { type: Date, default: Date.now, index: true },
    saleType: { type: String, enum: ['sent', 'received'], default: 'sent' },
  },
  { timestamps: true }
);

businessSaleSchema.index({ businessId: 1, date: -1 });

export const BusinessSale: Model<IBusinessSale> =
  mongoose.models.BusinessSale || mongoose.model<IBusinessSale>("BusinessSale", businessSaleSchema);
