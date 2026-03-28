import mongoose, { Document, Model, Schema } from "mongoose";

export interface IPoolTwilio {
    sid: string;
    authToken_encrypted: string;  // AES-256-GCM ciphertext (hex)
    iv: string;                   // AES-256-GCM IV (hex)
    whatsappNumber: string;       // e.g. "whatsapp:+14155238886"
}

export interface IPool extends Document {
    // Core identity
    poolId: string;
    poolName: string;
    slug: string;
    adminEmail: string;
    adminPhone?: string;
    capacity: number;
    location?: string;
    status: "ACTIVE" | "SUSPENDED" | "INACTIVE";
    branding?: {
        logoUrl?: string;
        themeColor?: string;
        contactDetails?: string;
    };
    // ── Subscription fields (Phase 2) ──────────────────────────────────
    plan: "free" | "starter" | "pro" | "enterprise";
    subscriptionStatus: "trial" | "active" | "past_due" | "cancelled" | "paused";
    trialEndsAt?: Date;
    subscriptionEndsAt?: Date;
    maxMembers: number;       // Seat limit enforced at registration
    maxStaff: number;
    featuresEnabled: string[]; // e.g. ["face_scan", "whatsapp", "entertainment"]
    billingEmail?: string;
    // Pool isolated ID counters
    memberCounter: number;
    entertainmentMemberCounter: number;
    // ── Per-pool Twilio credentials (multi-tenant WhatsApp) ────────────
    twilio?: IPoolTwilio;
    isTwilioConnected: boolean;
    // ──────────────────────────────────────────────────────────────────
    createdAt: Date;
    updatedAt: Date;
}

const poolSchema = new Schema<IPool>(
    {
        poolId:     { type: String, required: true, unique: true, index: true },
        poolName:   { type: String, required: true },
        slug:       { type: String, required: true, unique: true, index: true },
        adminEmail: { type: String, required: true },
        adminPhone: { type: String },
        capacity:   { type: Number, required: true, default: 100 },
        location:   { type: String },
        status: {
            type: String,
            enum: ["ACTIVE", "SUSPENDED", "INACTIVE"],
            default: "ACTIVE",
        },
        branding: {
            logoUrl:        { type: String },
            themeColor:     { type: String, default: "#000000" },
            contactDetails: { type: String },
        },
        // ── Subscription ─────────────────────────────────────────────
        plan: {
            type: String,
            enum: ["free", "starter", "pro", "enterprise"],
            default: "free",
        },
        subscriptionStatus: {
            type: String,
            enum: ["trial", "active", "past_due", "cancelled", "paused"],
            default: "trial",
        },
        trialEndsAt:       { type: Date },
        subscriptionEndsAt:{ type: Date },
        maxMembers:        { type: Number, default: 50 },
        maxStaff:          { type: Number, default: 5 },
        featuresEnabled:   { type: [String], default: [] },
        billingEmail:      { type: String },
        // Pool isolated ID counters
        memberCounter:     { type: Number, default: 0 },
        entertainmentMemberCounter: { type: Number, default: 0 },
        // ── Per-pool Twilio (multi-tenant WhatsApp alerts) ─────────────
        twilio: {
            sid:                  { type: String },
            authToken_encrypted:  { type: String },
            iv:                   { type: String },
            whatsappNumber:       { type: String },
        },
        isTwilioConnected: { type: Boolean, default: false, index: true },
    },
    { timestamps: true }
);

poolSchema.index({ status: 1, subscriptionStatus: 1 });

export const Pool: Model<IPool> =
    mongoose.models.Pool || mongoose.model<IPool>("Pool", poolSchema);
