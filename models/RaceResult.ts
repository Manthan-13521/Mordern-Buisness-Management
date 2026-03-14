import mongoose, { Document, Model, Schema } from "mongoose";

export interface IRaceResult extends Document {
    raceEventId: mongoose.Types.ObjectId;
    participantId: mongoose.Types.ObjectId;
    timeMs: number; // Completion time in milliseconds
    placement: number; // 1st, 2nd, etc.
}

const raceResultSchema = new Schema<IRaceResult>(
    {
        raceEventId: { type: Schema.Types.ObjectId, ref: "RaceEvent", required: true, index: true },
        participantId: { type: Schema.Types.ObjectId, ref: "RaceParticipant", required: true },
        timeMs: { type: Number, required: true },
        placement: { type: Number, required: true },
    },
    { timestamps: true }
);

export const RaceResult: Model<IRaceResult> =
    mongoose.models.RaceResult || mongoose.model<IRaceResult>("RaceResult", raceResultSchema);
