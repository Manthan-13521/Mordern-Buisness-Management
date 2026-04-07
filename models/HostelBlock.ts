import mongoose, { Document, Model, Schema } from "mongoose";

export interface IHostelBlock extends Document {
    hostelId: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
}

const hostelBlockSchema = new Schema<IHostelBlock>(
    {
        hostelId: { type: String, required: true, index: true },
        name:     { type: String, required: true },
    },
    { timestamps: true }
);

// Compound index to ensure block names are unique per hostel
hostelBlockSchema.index({ hostelId: 1, name: 1 }, { unique: true });

export const HostelBlock: Model<IHostelBlock> =
    mongoose.models.HostelBlock ||
    mongoose.model<IHostelBlock>("HostelBlock", hostelBlockSchema);
