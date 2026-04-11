import mongoose, { Document, Model, Schema } from "mongoose";

export interface IBusinessLabour extends Document {
  name: string;
  role: string;
  salary: number;
  phone?: string;
  businessId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const businessLabourSchema = new Schema<IBusinessLabour>(
  {
    name: { type: String, required: true },
    role: { type: String, required: true },
    salary: { type: Number, required: true },
    phone: { type: String },
    businessId: { type: String, required: true, index: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

businessLabourSchema.index({ businessId: 1, name: 1 });

export const BusinessLabour: Model<IBusinessLabour> =
  mongoose.models.BusinessLabour || mongoose.model<IBusinessLabour>("BusinessLabour", businessLabourSchema);
