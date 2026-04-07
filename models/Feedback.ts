import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IFeedback extends Document {
  userId: string;
  userName: string;
  type: 'bug' | 'feedback' | 'feature';
  message: string;
  screenshot?: string;
  status: 'open' | 'in-progress' | 'resolved';
  page: string;
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
  updatedAt: Date;
}

const FeedbackSchema = new Schema<IFeedback>(
  {
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    type: { type: String, enum: ['bug', 'feedback', 'feature'], required: true },
    message: { type: String, required: true },
    screenshot: { type: String, default: '' },
    status: { type: String, enum: ['open', 'in-progress', 'resolved'], default: 'open' },
    page: { type: String, required: true },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
  },
  { timestamps: true }
);

export const Feedback: Model<IFeedback> =
  mongoose.models.Feedback || mongoose.model<IFeedback>('Feedback', FeedbackSchema);
