import mongoose, { Document, Model, Schema } from "mongoose";
import type { AdSlotName } from "@/lib/ad-slots";

export type AdType = "inline" | "popup" | "top-strip" | "sidebar" | "bottom-sheet" | "carousel" | "native" | "video" | "image";

export interface IAd extends Document {
    title: string;
    description?: string;
    imageUrl: string;
    videoUrl?: string;
    targetUrl?: string;
    ctaText?: string;
    type: AdType;
    placementSlot: AdSlotName;
    designMode?: "compact" | "standard" | "premium" | "minimal" | "glass";
    isActive: boolean;
    startDate: Date;
    endDate: Date;
    targetModules: string[];
    targetPages: string[];
    targetOrganizations: string[];
    targetPlans: string[];
    targetCities: string[];
    targetRoles: string[];
    displayIntervalMinutes: number;
    frequencyCap: number;
    priority: number;
    impressions: number;
    clicks: number;
    dismissals: number;
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const adSchema = new Schema<IAd>(
    {
        title: { type: String, required: true },
        description: { type: String },
        imageUrl: { type: String, required: true },
        videoUrl: { type: String },
        targetUrl: { type: String },
        ctaText: { type: String, default: "Learn More" },
        type: {
            type: String,
            enum: ["inline", "popup", "top-strip", "sidebar", "bottom-sheet", "carousel", "native", "video", "image"],
            required: true,
        },
        placementSlot: {
            type: String,
            enum: [
                "dashboard-inline", "dashboard-sidebar",
                "members-top", "members-inline",
                "sidebar", "top-strip", "bottom-sheet",
                "popup", "analytics-bottom",
            ],
            required: true,
            index: true,
        },
        designMode: {
            type: String,
            enum: ["compact", "standard", "premium", "minimal", "glass"],
            default: "standard",
        },
        isActive: { type: Boolean, default: true, index: true },
        startDate: { type: Date, required: true, index: true },
        endDate: { type: Date, required: true, index: true },
        targetModules: { type: [String], required: true, index: true },
        targetPages: { type: [String], required: true, index: true },
        targetOrganizations: { type: [String], default: [] },
        targetPlans: { type: [String], default: [] },
        targetCities: { type: [String], default: [] },
        targetRoles: { type: [String], default: [] },
        displayIntervalMinutes: { type: Number, default: 30 },
        frequencyCap: { type: Number, default: 0 }, // 0 = unlimited
        priority: { type: Number, default: 0, index: true },
        impressions: { type: Number, default: 0 },
        clicks: { type: Number, default: 0 },
        dismissals: { type: Number, default: 0 },
        createdBy: { type: Schema.Types.ObjectId, ref: "PlatformAdmin", required: true },
    },
    { timestamps: true }
);

// Compound index for the primary ad resolution query
adSchema.index({ isActive: 1, startDate: 1, endDate: 1, placementSlot: 1 });

export const Ad: Model<IAd> = mongoose.models.Ad || mongoose.model<IAd>("Ad", adSchema);
