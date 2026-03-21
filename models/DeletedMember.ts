import mongoose, { Document, Model, Schema } from "mongoose";

export interface IDeletedMember extends Document {
    originalId: mongoose.Types.ObjectId;
    memberId: string;
    name: string;
    phone: string;
    poolId: string;
    deletedAt: Date;
    deletionType: "auto" | "manual";
    collectionSource: "members" | "entertainment_members";
    fullData: any; // Flexible snapshot of the document at deletion time
    createdAt: Date;
    updatedAt: Date;
}

const deletedMemberSchema = new Schema<IDeletedMember>(
    {
        originalId: { type: Schema.Types.ObjectId, required: true },
        memberId: { type: String, required: true },
        name: { type: String, required: true },
        phone: { type: String, required: true },
        poolId: { type: String, required: true, index: true },
        deletedAt: { type: Date, required: true, default: Date.now, index: true },
        deletionType: { type: String, enum: ["auto", "manual"], required: true },
        collectionSource: { type: String, enum: ["members", "entertainment_members"], required: true },
        fullData: { type: Schema.Types.Mixed, required: true },
    },
    { timestamps: true }
);

deletedMemberSchema.index({ poolId: 1, deletedAt: -1 });

export const DeletedMember: Model<IDeletedMember> =
    mongoose.models.DeletedMember || mongoose.model<IDeletedMember>("DeletedMember", deletedMemberSchema);
