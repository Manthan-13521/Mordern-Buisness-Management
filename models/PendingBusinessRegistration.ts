import mongoose, { Document, Model, Schema } from "mongoose";

export interface IPendingBusinessRegistration extends Document {
    businessName: string;
    adminName: string;
    adminEmail: string;
    adminPhone?: string;
    passwordHash: string;
    address?: string;
    gstNumber?: string;
    planType: "quarterly" | "yearly";
    razorpayOrderId?: string;
    status: "pending" | "completed" | "expired";
    createdAt: Date;
    updatedAt: Date;
}

const pendingBusinessRegistrationSchema = new Schema<IPendingBusinessRegistration>(
    {
        businessName:    { type: String, required: true },
        adminName:       { type: String, required: true },
        adminEmail:      { type: String, required: true, index: true },
        adminPhone:      { type: String },
        passwordHash:    { type: String, required: true },
        address:         { type: String },
        gstNumber:       { type: String },
        planType:        { type: String, enum: ["quarterly", "yearly"], required: true },
        razorpayOrderId: { type: String, sparse: true, index: true },
        status: {
            type: String,
            enum: ["pending", "completed", "expired"],
            default: "pending",
            index: true,
        },
    },
    { timestamps: true }
);

// TTL: auto-delete pending records after 24 hours
pendingBusinessRegistrationSchema.index(
    { createdAt: 1 },
    { expireAfterSeconds: 24 * 60 * 60, partialFilterExpression: { status: "pending" } }
);

// Idempotency: one pending registration per razorpayOrderId
pendingBusinessRegistrationSchema.index(
    { razorpayOrderId: 1 },
    { unique: true, partialFilterExpression: { razorpayOrderId: { $exists: true, $ne: null } } }
);

export const PendingBusinessRegistration: Model<IPendingBusinessRegistration> =
    mongoose.models.PendingBusinessRegistration ||
    mongoose.model<IPendingBusinessRegistration>("PendingBusinessRegistration", pendingBusinessRegistrationSchema);
