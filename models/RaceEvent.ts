import mongoose, { Document, Model, Schema } from "mongoose";

export interface IRaceEvent extends Document {
    poolId: string;
    eventName: string;
    eventDate: Date;
    description?: string;
    status: "upcoming" | "active" | "completed";
    createdAt: Date;
    updatedAt: Date;
}

const raceEventSchema = new Schema<IRaceEvent>(
    {
        poolId: { type: String, required: true, index: true },
        eventName: { type: String, required: true },
        eventDate: { type: Date, required: true },
        description: { type: String },
        status: { type: String, enum: ["upcoming", "active", "completed"], default: "upcoming" },
    },
    { timestamps: true }
);

export const RaceEvent: Model<IRaceEvent> =
    mongoose.models.RaceEvent || mongoose.model<IRaceEvent>("RaceEvent", raceEventSchema);
