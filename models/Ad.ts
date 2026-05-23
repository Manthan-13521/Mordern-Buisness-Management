import mongoose, { Document, Model, Schema } from "mongoose";
import type { AdSlotName } from "@/lib/ad-slots";
import { AD_SLOT_LIST } from "@/lib/ad-slots";

export type AdType = "inline" | "popup" | "top-strip" | "sidebar" | "bottom-sheet" | "carousel" | "native" | "video" | "image";
export type CampaignStatus = "draft" | "scheduled" | "active" | "paused" | "expired" | "archived";
export type DeliveryStrategy = "single" | "rotate" | "weighted" | "sequential";

export interface ISlotAnalytics {
    slotName: string;
    impressions: number;
    clicks: number;
    dismissals: number;
    ctr: number;
    deviceAnalytics: {
        desktop: { impressions: number; clicks: number };
        tablet: { impressions: number; clicks: number };
        mobile: { impressions: number; clicks: number };
    };
}

export interface IAd extends Document {
    title: string;
    description?: string;
    imageUrl: string;
    videoUrl?: string;
    targetUrl?: string;
    ctaText?: string;
    type: AdType;
    placementSlots: AdSlotName[];
    designMode?: "compact" | "standard" | "premium" | "minimal" | "glass";
    
    // Delivery Configuration
    status: CampaignStatus;
    deliveryStrategy: DeliveryStrategy;
    
    startDate: Date;
    endDate: Date;
    
    // Targeting
    targetModules: string[];
    targetPages: string[];
    targetOrganizations: string[];
    targetPlans: string[];
    targetCities: string[];
    targetRoles: string[];
    
    // Rules
    displayIntervalMinutes: number;
    frequencyCap: number;
    priority: number;
    
    // Global Metrics
    impressions: number;
    clicks: number;
    dismissals: number;
    
    // Slot-scoped Metrics
    slotAnalytics: ISlotAnalytics[];

    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const slotAnalyticsSchema = new Schema<ISlotAnalytics>({
    slotName: { type: String, required: true },
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    dismissals: { type: Number, default: 0 },
    ctr: { type: Number, default: 0 },
    deviceAnalytics: {
        desktop: {
            impressions: { type: Number, default: 0 },
            clicks: { type: Number, default: 0 },
        },
        tablet: {
            impressions: { type: Number, default: 0 },
            clicks: { type: Number, default: 0 },
        },
        mobile: {
            impressions: { type: Number, default: 0 },
            clicks: { type: Number, default: 0 },
        }
    }
}, { _id: false });

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
        placementSlots: {
            type: [String],
            enum: AD_SLOT_LIST,
            required: true,
            default: [],
            index: true,
        },
        designMode: {
            type: String,
            enum: ["compact", "standard", "premium", "minimal", "glass"],
            default: "standard",
        },
        status: { 
            type: String, 
            enum: ["draft", "scheduled", "active", "paused", "expired", "archived"], 
            default: "active", 
            index: true 
        },
        deliveryStrategy: {
            type: String,
            enum: ["single", "rotate", "weighted", "sequential"],
            default: "single"
        },
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
        
        slotAnalytics: { type: [slotAnalyticsSchema], default: [] },

        createdBy: { type: Schema.Types.ObjectId, ref: "PlatformAdmin", required: true },
    },
    { timestamps: true }
);

// Compound index for the primary ad resolution query
adSchema.index({ status: 1, startDate: 1, endDate: 1, placementSlots: 1 });

export const Ad: Model<IAd> = mongoose.models.Ad || mongoose.model<IAd>("Ad", adSchema);
