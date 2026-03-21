import mongoose, { Document, Model, Schema } from "mongoose";

export interface ISettings extends Document {
    poolCapacity: number;
    currentOccupancy: number;
    occupancyDurationMinutes: number;
    lastBackupAt?: Date;
    updatedAt: Date;
    createdAt: Date;
}

const settingsSchema = new Schema<ISettings>(
    {
        poolCapacity: { type: Number, required: true, default: 50 },
        currentOccupancy: { type: Number, default: 0, min: 0 },
        occupancyDurationMinutes: { type: Number, default: 60, min: 1 },
        lastBackupAt: { type: Date },
    },
    { timestamps: true }
);

if (mongoose.models.Settings) {
    delete mongoose.models.Settings;
}

export const Settings: Model<ISettings> = mongoose.model<ISettings>("Settings", settingsSchema);

/** Fetch or create the singleton settings document */
export async function getSettings(): Promise<ISettings> {
    let settings = await Settings.findOne({});
    if (!settings) {
        settings = await Settings.create({ poolCapacity: 50, currentOccupancy: 0, occupancyDurationMinutes: 60 });
    }
    return settings;
}
