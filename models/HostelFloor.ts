import mongoose, { Document, Model, Schema } from "mongoose";

export interface IHostelFloor extends Document {
    hostelId: string;
    blockId: mongoose.Types.ObjectId;
    floorNo: string;
    createdAt: Date;
    updatedAt: Date;
}

const hostelFloorSchema = new Schema<IHostelFloor>(
    {
        hostelId: { type: String, required: true, index: true },
        blockId:  { type: Schema.Types.ObjectId, ref: "HostelBlock", required: true, index: true },
        floorNo:  { type: String, required: true },
    },
    { timestamps: true }
);

// Compound index to ensure floor names are unique per block
hostelFloorSchema.index({ blockId: 1, floorNo: 1 }, { unique: true });

export const HostelFloor: Model<IHostelFloor> =
    mongoose.models.HostelFloor ||
    mongoose.model<IHostelFloor>("HostelFloor", hostelFloorSchema);
