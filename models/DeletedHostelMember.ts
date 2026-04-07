import mongoose, { Document, Model, Schema } from "mongoose";

export interface IDeletedHostelMember extends Document {
    memberId: string;
    hostelId: string;
    name: string;
    phone: string;
    join_date?: Date;
    vacated_at?: Date;
    deletedAt: Date;
    originalDoc: any; // Keep the whole original object for completeness
}

const deletedHostelMemberSchema = new Schema<IDeletedHostelMember>(
    {
        memberId: { type: String, required: true },
        hostelId: { type: String, required: true },
        name: { type: String, required: true },
        phone: { type: String },
        join_date: { type: Date },
        vacated_at: { type: Date },
        deletedAt: { type: Date, required: true, default: Date.now },
        originalDoc: { type: Schema.Types.Mixed },
    },
    { timestamps: true }
);

deletedHostelMemberSchema.index({ hostelId: 1, deletedAt: -1 });

export const DeletedHostelMember: Model<IDeletedHostelMember> =
    mongoose.models.DeletedHostelMember || mongoose.model<IDeletedHostelMember>("DeletedHostelMember", deletedHostelMemberSchema);
