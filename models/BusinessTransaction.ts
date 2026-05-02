import mongoose, { Document, Model, Schema } from "mongoose";

export interface ITransactionItem {
  name: string;
  qty: number;
  price: number;
}

export interface IBusinessTransaction extends Document {
  customerId: mongoose.Types.ObjectId;
  businessId: string;
  date: Date;
  category: "SALE" | "PAYMENT";
  transactionType: "received" | "paid" | "sent";
  amount: number; // For sales, this is totalAmount. For payments, this is amount.
  
  // Sale specific fields (optional)
  items?: ITransactionItem[];
  transportationCost?: number;
  
  // Payment specific fields (optional)
  paymentMethod?: "cash" | "upi";
  notes?: string;
  receiptUrl?: string;
  paidAmount?: number;
  
  createdAt: Date;
  updatedAt: Date;
}

const transactionItemSchema = new Schema<ITransactionItem>(
  {
    name: { type: String, required: true },
    qty: { type: Number, required: true },
    price: { type: Number, required: true },
  },
  { _id: false }
);

const businessTransactionSchema = new Schema<IBusinessTransaction>(
  {
    customerId: { type: Schema.Types.ObjectId, ref: "BusinessCustomer", required: true, index: true },
    businessId: { type: String, required: true, index: true },
    date: { type: Date, default: Date.now, index: true },
    category: { type: String, enum: ["SALE", "PAYMENT"], required: true },
    transactionType: { type: String, enum: ["received", "paid", "sent"], required: true },
    amount: { type: Number, required: true },
    
    // Sale related
    items: [transactionItemSchema],
    transportationCost: { type: Number, default: 0 },
    
    // Payment related
    paymentMethod: { type: String, enum: ["cash", "upi"] },
    notes: { type: String },
    receiptUrl: { type: String },
    paidAmount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

businessTransactionSchema.index({ businessId: 1, customerId: 1, date: -1 });

// Compound index optimized for analytics aggregation queries:
// Revenue (SALE+sent) and Expenses (SALE+received) both filter on these 4 fields
businessTransactionSchema.index({ businessId: 1, category: 1, transactionType: 1, date: -1 });

export const BusinessTransaction: Model<IBusinessTransaction> =
  mongoose.models.BusinessTransaction || mongoose.model<IBusinessTransaction>("BusinessTransaction", businessTransactionSchema);
