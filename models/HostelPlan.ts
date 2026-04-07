import mongoose, { Document, Model, Schema } from "mongoose";

export interface IHostelPlan extends Document {
    hostelId: string;
    name: string;
    durationDays: number;
    price: number;
    description?: string;
    enableWhatsAppAlerts: boolean;
    // WhatsApp message templates
    messages?: {
        beforeExpiry: { text: string; mediaUrl?: string | null };
        onExpiry:     { text: string; mediaUrl?: string | null };
        afterExpiry:  { text: string; mediaUrl?: string | null };
    };
    isActive: boolean;
    deletedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const hostelPlanSchema = new Schema<IHostelPlan>(
    {
        hostelId:    { type: String, required: true, index: true },
        name:        { type: String, required: true },
        durationDays:{ type: Number, required: true, min: 1 },
        price:       { type: Number, required: true, min: 0 },
        description: { type: String },
        enableWhatsAppAlerts: { type: Boolean, default: false },
        messages: {
            beforeExpiry: {
                text:     { type: String, default: "⏳ Your hostel membership expires in 2 days. Please renew to continue your stay!" },
                mediaUrl: { type: String, default: null },
            },
            onExpiry: {
                text:     { type: String, default: "📅 Your hostel membership expires today. Please renew immediately!" },
                mediaUrl: { type: String, default: null },
            },
            afterExpiry: {
                text:     { type: String, default: "❌ Your hostel membership has expired. Please renew to continue your stay!" },
                mediaUrl: { type: String, default: null },
            },
        },
        isActive:  { type: Boolean, default: true },
        deletedAt: { type: Date, default: null },
    },
    { timestamps: true }
);

hostelPlanSchema.index({ hostelId: 1, isActive: 1 });

export const HostelPlan: Model<IHostelPlan> =
    mongoose.models.HostelPlan ||
    mongoose.model<IHostelPlan>("HostelPlan", hostelPlanSchema);
