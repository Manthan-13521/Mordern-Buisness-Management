import mongoose, { Document, Model, Schema } from "mongoose";

export type HostelLogType = "registration" | "renewal" | "delete" | "payment_update" | "checkin" | "checkout" | "payment" | "plan_change" | "manual_delete";

export interface IHostelLog extends Document {
    hostelId: string;
    type: HostelLogType;
    memberId?: string;           // HostelMember.memberId (string ID for display)
    memberObjectId?: mongoose.Types.ObjectId; // HostelMember._id
    memberName?: string;
    description: string;
    performedBy?: string;        // admin user email or name
    meta?: Record<string, unknown>;
    createdAt: Date;
}

const hostelLogSchema = new Schema<IHostelLog>(
    {
        hostelId:       { type: String, required: true, index: true },
        type: {
            type: String,
            enum: ["registration", "renewal", "delete", "payment_update", "checkin", "checkout", "payment", "plan_change", "manual_delete"],
            required: true,
        },
        memberId:       { type: String },
        memberObjectId: { type: Schema.Types.ObjectId, ref: "HostelMember" },
        memberName:     { type: String },
        description:    { type: String, required: true },
        performedBy:    { type: String },
        meta:           { type: Schema.Types.Mixed },
        createdAt:      { type: Date, default: Date.now, index: true },
    },
    { timestamps: true }
);

hostelLogSchema.index({ hostelId: 1, createdAt: -1 });
hostelLogSchema.index({ hostelId: 1, type: 1 });

export const HostelLog: Model<IHostelLog> =
    mongoose.models.HostelLog ||
    mongoose.model<IHostelLog>("HostelLog", hostelLogSchema);
