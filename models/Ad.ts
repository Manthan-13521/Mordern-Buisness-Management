import mongoose, { Document, Model, Schema } from "mongoose";

export type AdType = "corner" | "popup" | "both";

export interface IAd extends Document {
    title: string;
    description?: string;
    imageUrl: string;
    targetUrl?: string;
    type: AdType;
    isActive: boolean;
    startDate: Date;
    endDate: Date;
    targetModules: string[];
    targetPages: string[];
    displayIntervalMinutes: number;
    priority: number;
    impressions: number;
    clicks: number;
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const adSchema = new Schema<IAd>(
    {
        title: { type: String, required: true },
        description: { type: String },
        imageUrl: { type: String, required: true },
        targetUrl: { type: String },
        type: { type: String, enum: ["corner", "popup", "both"], required: true },
        isActive: { type: Boolean, default: true, index: true },
        startDate: { type: Date, required: true, index: true },
        endDate: { type: Date, required: true, index: true },
        targetModules: { type: [String], required: true, index: true },
        targetPages: { type: [String], required: true, index: true },
        displayIntervalMinutes: { type: Number, default: 30 },
        priority: { type: Number, default: 0, index: true },
        impressions: { type: Number, default: 0 },
        clicks: { type: Number, default: 0 },
        createdBy: { type: Schema.Types.ObjectId, ref: "PlatformAdmin", required: true },
    },
    { timestamps: true }
);

// We rely on indices for isActive, date ranges, modules, and pages to speed up queries.
// A compound index might be overkill since there shouldn't be thousands of active ads at a time,
// but the individual indices are helpful.

export const Ad: Model<IAd> = mongoose.models.Ad || mongoose.model<IAd>("Ad", adSchema);
