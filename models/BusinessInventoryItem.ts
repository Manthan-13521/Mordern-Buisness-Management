import mongoose, { Document, Model, Schema } from "mongoose";

export interface IBusinessInventoryItem extends Document {
  name: string;
  sku: string;
  category: string;
  unit: string;
  currentStock: number;
  minimumStock: number;
  costPrice?: number;
  averageCost?: number;
  barcode?: string;
  supplier?: string;
  notes?: string;
  
  isArchived: boolean;
  archivedAt?: Date;
  archivedBy?: mongoose.Types.ObjectId;
  
  version: number; // Optimistic Concurrency Control
  
  // Future-proofing
  batchNumber?: string;
  expiryDate?: Date;
  reservedQuantity?: number;
  availableQuantity?: number;
  location?: string;
  supplierId?: string;

  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  businessId: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const businessInventoryItemSchema = new Schema<IBusinessInventoryItem>(
  {
    name: { type: String, required: true },
    sku: { type: String, required: true },
    category: { type: String, default: "General" },
    unit: { type: String, required: true },
    currentStock: { type: Number, default: 0 },
    minimumStock: { type: Number, default: 0 },
    costPrice: { type: Number },
    averageCost: { type: Number },
    barcode: { type: String },
    supplier: { type: String },
    notes: { type: String },
    
    isArchived: { type: Boolean, default: false },
    archivedAt: { type: Date },
    archivedBy: { type: Schema.Types.ObjectId, ref: "User" },
    
    version: { type: Number, default: 1 },
    
    batchNumber: { type: String },
    expiryDate: { type: Date },
    reservedQuantity: { type: Number, default: 0 },
    availableQuantity: { type: Number, default: 0 },
    location: { type: String },
    supplierId: { type: String },
    
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    businessId: { type: String, required: true },
  },
  { 
    timestamps: true,
    optimisticConcurrency: true, // Enables optimistic concurrency control
    versionKey: 'version' // Automatically manages 'version' field
  }
);

// High-performance query indexes
businessInventoryItemSchema.index({ businessId: 1, sku: 1 }, { unique: true });
businessInventoryItemSchema.index({ businessId: 1, category: 1 });
businessInventoryItemSchema.index({ businessId: 1, updatedAt: -1 });
businessInventoryItemSchema.index({ businessId: 1, currentStock: 1 });
businessInventoryItemSchema.index({ businessId: 1, isArchived: 1 });

export const BusinessInventoryItem: Model<IBusinessInventoryItem> =
  mongoose.models.BusinessInventoryItem || mongoose.model<IBusinessInventoryItem>("BusinessInventoryItem", businessInventoryItemSchema);
