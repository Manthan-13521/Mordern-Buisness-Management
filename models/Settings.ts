import mongoose, { Document, Model, Schema } from "mongoose";

export interface ISettings extends Document {
    poolCapacity: number;
    currentOccupancy: number;
    lastBackupAt?: Date;
    updatedAt: Date;
    createdAt: Date;
}

const settingsSchema = new Schema<ISettings>(
    {
        poolCapacity: { type: Number, required: true, default: 50 },
        currentOccupancy: { type: Number, default: 0, min: 0 },
        lastBackupAt: { type: Date },
    },
    { timestamps: true }
);

export const Settings: Model<ISettings> =
    mongoose.models.Settings || mongoose.model<ISettings>("Settings", settingsSchema);

/** Fetch or create the singleton settings document */
export async function getSettings(): Promise<ISettings> {
    let settings = await Settings.findOne({});
    if (!settings) {
        settings = await Settings.create({ poolCapacity: 50, currentOccupancy: 0 });
    }
    return settings;
}
