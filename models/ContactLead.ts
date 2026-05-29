import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IContactLead extends Document {
  name: string;
  email: string;
  phone: string;
  message: string;
  source: string;
  status: 'new' | 'contacted' | 'scheduled' | 'closed';
  createdAt: Date;
  updatedAt: Date;
}

const ContactLeadSchema = new Schema<IContactLead>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, default: '' },
    message: { type: String, required: true },
    source: { type: String, default: 'contact-form' },
    status: { type: String, enum: ['new', 'contacted', 'scheduled', 'closed'], default: 'new' },
  },
  { timestamps: true }
);

export const ContactLead: Model<IContactLead> =
  mongoose.models.ContactLead || mongoose.model<IContactLead>('ContactLead', ContactLeadSchema);
