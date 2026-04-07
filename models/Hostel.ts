import mongoose, { Document, Model, Schema } from "mongoose";

export interface IHostelTwilio {
    sid: string;
    authToken_encrypted: string;
    iv: string;
    whatsappNumber: string;
}

export interface IHostel extends Document {
    hostelId: string;
    hostelName: string;
    slug: string;
    city: string;
    adminEmail: string;
    adminPhone?: string;
    numberOfBlocks: number;
    status: "ACTIVE" | "SUSPENDED" | "INACTIVE";
    // Subscription
    plan: "free" | "starter" | "pro" | "enterprise";
    subscriptionStatus: "trial" | "active" | "past_due" | "cancelled" | "paused";
    subscriptionEndsAt?: Date;
    // Twilio / WhatsApp
    twilio?: IHostelTwilio;
    isTwilioConnected: boolean;
    // Counter for member IDs
    memberCounter: number;
    createdAt: Date;
    updatedAt: Date;
}

const hostelSchema = new Schema<IHostel>(
    {
        hostelId:       { type: String, required: true, unique: true, index: true },
        hostelName:     { type: String, required: true },
        slug:           { type: String, required: true, unique: true, index: true },
        city:           { type: String, required: true },
        adminEmail:     { type: String, required: true },
        adminPhone:     { type: String },
        numberOfBlocks: { type: Number, required: true, min: 1, max: 4, default: 1 },
        status: {
            type: String,
            enum: ["ACTIVE", "SUSPENDED", "INACTIVE"],
            default: "ACTIVE",
        },
        plan: {
            type: String,
            enum: ["free", "starter", "pro", "enterprise"],
            default: "free",
        },
        subscriptionStatus: {
            type: String,
            enum: ["trial", "active", "past_due", "cancelled", "paused"],
            default: "active",
        },
        subscriptionEndsAt: { type: Date },
        twilio: {
            sid:                 { type: String },
            authToken_encrypted: { type: String },
            iv:                  { type: String },
            whatsappNumber:      { type: String },
        },
        isTwilioConnected: { type: Boolean, default: false, index: true },
        memberCounter:     { type: Number, default: 0 },
    },
    { timestamps: true }
);

hostelSchema.index({ status: 1, subscriptionStatus: 1 });

export const Hostel: Model<IHostel> =
    mongoose.models.Hostel || mongoose.model<IHostel>("Hostel", hostelSchema);
