import mongoose, { Document, Model, Schema } from "mongoose";

export interface IFaceEmbedding extends Document {
    memberId: string;
    poolId: string;
    embeddingVector: number[]; // 512-dim array from DeepFace / ArcFace
    createdAt: Date;
    updatedAt: Date;
}

const faceEmbeddingSchema = new Schema<IFaceEmbedding>(
    {
        memberId: { type: String, required: true, unique: true, index: true },
        poolId: { type: String, required: true, index: true },
        embeddingVector: { type: [Number], required: true },
    },
    { timestamps: true }
);

export const FaceEmbedding: Model<IFaceEmbedding> =
    mongoose.models.FaceEmbedding || mongoose.model<IFaceEmbedding>("FaceEmbedding", faceEmbeddingSchema);
