import mongoose, { Document, Model, Schema } from "mongoose";

export interface ICompetition extends Document {
    poolId: string;
    name: string;
    date: Date;
    category: string;
    participants: {
        memberId: mongoose.Types.ObjectId;
        name: string;
        laneNumber?: number;
        timing?: number; // seconds
        position?: number;
    }[];
    winners: {
        position: number;
        memberId: mongoose.Types.ObjectId;
        name: string;
        timing?: number;
        prize?: string;
    }[];
    notes?: string;
    isCompleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const competitionSchema = new Schema<ICompetition>(
    {
        poolId: { type: String, required: true, index: true },
        name: { type: String, required: true },
        date: { type: Date, required: true },
        category: { type: String, required: true },
        participants: [
            {
                memberId: { type: Schema.Types.ObjectId, ref: "Member" },
                name: { type: String, required: true },
                laneNumber: { type: Number },
                timing: { type: Number },
                position: { type: Number },
            },
        ],
        winners: [
            {
                position: { type: Number, required: true },
                memberId: { type: Schema.Types.ObjectId, ref: "Member" },
                name: { type: String, required: true },
                timing: { type: Number },
                prize: { type: String },
            },
        ],
        notes: { type: String },
        isCompleted: { type: Boolean, default: false },
    },
    { timestamps: true }
);

competitionSchema.index({ poolId: 1, date: -1 });

export const Competition: Model<ICompetition> =
    mongoose.models.Competition ||
    mongoose.model<ICompetition>("Competition", competitionSchema);
