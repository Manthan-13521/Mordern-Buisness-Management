import mongoose, { Document, Model, Schema } from "mongoose";

export interface IHostelSettings extends Document {
    hostelId: string;
    whatsappEnabled: boolean;
    whatsappMessageTemplate?: string;
    twilioSid?: string;
    twilioWhatsappNumber?: string;
    lastBackupAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const hostelSettingsSchema = new Schema<IHostelSettings>(
    {
        hostelId:                { type: String, required: true, unique: true, index: true },
        whatsappEnabled:         { type: Boolean, default: false },
        whatsappMessageTemplate: { type: String, default: "Dear {name}, your stay at {hostelName} expires on {expiry}. Please renew promptly." },
        twilioSid:               { type: String },
        twilioWhatsappNumber:    { type: String },
        lastBackupAt:            { type: Date },
    },
    { timestamps: true }
);

export const HostelSettings: Model<IHostelSettings> =
    mongoose.models.HostelSettings ||
    mongoose.model<IHostelSettings>("HostelSettings", hostelSettingsSchema);

// ── Helper: Get or create settings doc for hostel ──────────────────────────
export async function getHostelSettings(hostelId: string): Promise<IHostelSettings> {
    let settings = await HostelSettings.findOne({ hostelId });
    if (!settings) {
        settings = await HostelSettings.create({ hostelId });
    }
    return settings;
}
