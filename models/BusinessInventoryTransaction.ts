import mongoose, { Document, Model, Schema } from "mongoose";
import { StockAction, StockReason } from "@/lib/stockHelper";

export interface IBusinessInventoryTransaction extends Document {
  txnId: string;
  itemId: mongoose.Types.ObjectId;
  businessId: string;
  
  action: StockAction;
  reason: StockReason;
  
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  
  notes?: string;
  userId?: mongoose.Types.ObjectId; // User who recorded this transaction
  
  createdAt: Date;
  updatedAt: Date;
}

const businessInventoryTransactionSchema = new Schema<IBusinessInventoryTransaction>(
  {
    txnId: { type: String, required: true },
    itemId: { type: Schema.Types.ObjectId, ref: "BusinessInventoryItem", required: true },
    businessId: { type: String, required: true },
    
    action: { type: String, enum: Object.values(StockAction), required: true },
    reason: { type: String, enum: Object.values(StockReason), required: true },
    
    quantity: { type: Number, required: true },
    previousQuantity: { type: Number, required: true },
    newQuantity: { type: Number, required: true },
    
    notes: { type: String },
    userId: { type: Schema.Types.ObjectId, ref: "User" }
  },
  { 
    timestamps: true 
  }
);

// High-performance query indexes for ledger and aggregations
businessInventoryTransactionSchema.index({ txnId: 1 }, { unique: true });
businessInventoryTransactionSchema.index({ businessId: 1, itemId: 1, createdAt: -1 });
businessInventoryTransactionSchema.index({ businessId: 1, action: 1, createdAt: -1 });
businessInventoryTransactionSchema.index({ businessId: 1, createdAt: -1 });

export const BusinessInventoryTransaction: Model<IBusinessInventoryTransaction> =
  mongoose.models.BusinessInventoryTransaction || mongoose.model<IBusinessInventoryTransaction>("BusinessInventoryTransaction", businessInventoryTransactionSchema);
