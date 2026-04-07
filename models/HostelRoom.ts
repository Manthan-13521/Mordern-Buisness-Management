import mongoose, { Document, Model, Schema } from "mongoose";

export interface IHostelRoom extends Document {
    hostelId: string;
    blockId: mongoose.Types.ObjectId;
    floorId: mongoose.Types.ObjectId;
    roomNo: string;
    capacity: number;
    createdAt: Date;
    updatedAt: Date;
}

const hostelRoomSchema = new Schema<IHostelRoom>(
    {
        hostelId: { type: String, required: true, index: true },
        blockId:  { type: Schema.Types.ObjectId, ref: "HostelBlock", required: true, index: true },
        floorId:  { type: Schema.Types.ObjectId, ref: "HostelFloor", required: true, index: true },
        roomNo:   { type: String, required: true },
        capacity: { type: Number, required: true, min: 1, default: 1 },
    },
    { timestamps: true }
);

// Compound index to ensure room numbers are unique per floor
hostelRoomSchema.index({ floorId: 1, roomNo: 1 }, { unique: true });

export const HostelRoom: Model<IHostelRoom> =
    mongoose.models.HostelRoom ||
    mongoose.model<IHostelRoom>("HostelRoom", hostelRoomSchema);
