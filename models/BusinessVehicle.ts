import mongoose, { Document, Model, Schema } from "mongoose";

export interface IBusinessVehicle extends Document {
  ownerName: string;
  vehicleNumber: string;
  businessId: string;
  createdAt: Date;
  updatedAt: Date;
}

const businessVehicleSchema = new Schema<IBusinessVehicle>(
  {
    ownerName: { type: String, required: true },
    vehicleNumber: { type: String, required: true },
    businessId: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

businessVehicleSchema.index({ businessId: 1, vehicleNumber: 1 }, { unique: true });

export const BusinessVehicle: Model<IBusinessVehicle> =
  mongoose.models.BusinessVehicle || mongoose.model<IBusinessVehicle>("BusinessVehicle", businessVehicleSchema);
