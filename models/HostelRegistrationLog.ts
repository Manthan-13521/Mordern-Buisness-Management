import mongoose, { Document, Model, Schema } from "mongoose";

export interface IHostelRegistrationLog extends Document {
  hostelId: string;
  memberId: string;
  memberName: string;
  roomNumber: string;
  join_date: Date;
  createdBy: string;
  createdAt: Date;
}

const hostelRegistrationLogSchema = new Schema<IHostelRegistrationLog>(
  {
    hostelId: { type: String, required: true, index: true },
    memberId: { type: String, required: true },
    memberName: { type: String, required: true },
    roomNumber: { type: String, required: true },
    join_date: { type: Date, required: true },
    createdBy: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

hostelRegistrationLogSchema.index({ hostelId: 1, createdAt: -1 });

export const HostelRegistrationLog: Model<IHostelRegistrationLog> =
  mongoose.models.HostelRegistrationLog ||
  mongoose.model<IHostelRegistrationLog>("HostelRegistrationLog", hostelRegistrationLogSchema);
