import mongoose, { Document, Model, Schema } from "mongoose";

export interface IBusiness extends Document {
  businessId: string;
  name: string;
  slug: string;
  ownerId?: mongoose.Types.ObjectId;
  phone?: string;
  address?: string;
  gstNumber?: string;
  logoUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const businessSchema = new Schema<IBusiness>(
  {
    businessId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    phone: { type: String },
    address: { type: String },
    gstNumber: { type: String },
    logoUrl: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Business: Model<IBusiness> =
  mongoose.models.Business || mongoose.model<IBusiness>("Business", businessSchema);

