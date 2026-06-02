import mongoose, { Document, Model, Schema } from "mongoose";

export interface IWebhookDLQ extends Document {
    eventType: string;
    razorpayPaymentId?: string;
    razorpayOrderId?: string;
    payload: any;
    error: string;
    retryCount: number;
    resolved: boolean;
    resolvedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const webhookDLQSchema = new Schema<IWebhookDLQ>(
    {
        eventType:         { type: String, required: true, index: true },
        razorpayPaymentId: { type: String, index: true, sparse: true },
        razorpayOrderId:   { type: String, index: true, sparse: true },
        payload:           { type: Schema.Types.Mixed, required: true },
        error:             { type: String, required: true },
        retryCount:        { type: Number, default: 0 },
        resolved:          { type: Boolean, default: false, index: true },
        resolvedAt:        { type: Date },
    },
    { timestamps: true }
);

// Compound index for monitoring queries
webhookDLQSchema.index({ resolved: 1, createdAt: -1 });

// TTL: auto-delete RESOLVED entries after 90 days
// Unresolved entries are kept indefinitely for manual review
webhookDLQSchema.index(
    { resolvedAt: 1 },
    { expireAfterSeconds: 90 * 24 * 60 * 60, partialFilterExpression: { resolved: true } }
);

export const WebhookDLQ: Model<IWebhookDLQ> =
    mongoose.models.WebhookDLQ || mongoose.model<IWebhookDLQ>("WebhookDLQ", webhookDLQSchema);
