import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IDemoRequest extends Document {
  name: string;
  email: string;
  phone: string;
  businessName: string;
  businessType: 'pool' | 'hostel' | 'business' | 'other';
  city: string;
  notes: string;
  source: string;
  status: 'new' | 'contacted' | 'scheduled' | 'closed';
  createdAt: Date;
  updatedAt: Date;
}

const DemoRequestSchema = new Schema<IDemoRequest>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    businessName: { type: String, required: true },
    businessType: { type: String, enum: ['pool', 'hostel', 'business', 'other'], required: true },
    city: { type: String, default: '' },
    notes: { type: String, default: '' },
    source: { type: String, default: 'website' },
    status: { type: String, enum: ['new', 'contacted', 'scheduled', 'closed'], default: 'new' },
  },
  { timestamps: true }
);

export const DemoRequest: Model<IDemoRequest> =
  mongoose.models.DemoRequest || mongoose.model<IDemoRequest>('DemoRequest', DemoRequestSchema);
