import mongoose, { Document, Model, Schema } from "mongoose";

export interface ICctvCamera extends Document {
    poolId: string;
    cameraName: string;
    streamUrl: string; // Embed URL or RTSP to HLS stream url
    status: "online" | "offline";
    createdAt: Date;
    updatedAt: Date;
}

const cctvCameraSchema = new Schema<ICctvCamera>(
    {
        poolId: { type: String, required: true, index: true },
        cameraName: { type: String, required: true },
        streamUrl: { type: String, required: true },
        status: { type: String, enum: ["online", "offline"], default: "online" },
    },
    { timestamps: true }
);

export const CctvCamera: Model<ICctvCamera> =
    mongoose.models.CctvCamera || mongoose.model<ICctvCamera>("CctvCamera", cctvCameraSchema);
