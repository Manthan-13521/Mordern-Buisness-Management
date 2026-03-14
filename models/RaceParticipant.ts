import mongoose, { Document, Model, Schema } from "mongoose";

export interface IRaceParticipant extends Document {
    raceEventId: mongoose.Types.ObjectId;
    memberId: mongoose.Types.ObjectId;
    assignedLane?: number;
    disqualified: boolean;
    createdAt: Date;
}

const raceParticipantSchema = new Schema<IRaceParticipant>(
    {
        raceEventId: { type: Schema.Types.ObjectId, ref: "RaceEvent", required: true, index: true },
        memberId: { type: Schema.Types.ObjectId, ref: "Member", required: true },
        assignedLane: { type: Number },
        disqualified: { type: Boolean, default: false },
    },
    { timestamps: true }
);

export const RaceParticipant: Model<IRaceParticipant> =
    mongoose.models.RaceParticipant || mongoose.model<IRaceParticipant>("RaceParticipant", raceParticipantSchema);
