import mongoose, { Document, Model, Schema } from "mongoose";

export interface IAccessLog extends Document {
    memberId: mongoose.Types.ObjectId;
    poolId: string;
    action: "auto_block" | "auto_unblock" | "manual_block" | "manual_unblock";
    reason: "defaulter" | "payment" | "admin";
    previousStatus: "active" | "blocked" | "suspended";
    newStatus: "active" | "blocked" | "suspended";
    createdAt: Date;
}

const accessLogSchema = new Schema<IAccessLog>(
    {
        memberId: { type: Schema.Types.ObjectId, ref: "Member", required: true, index: true },
        poolId: { type: String, required: true, index: true },
        action: { 
            type: String, 
            enum: ["auto_block", "auto_unblock", "manual_block", "manual_unblock"], 
            required: true 
        },
        reason: { 
            type: String, 
            enum: ["defaulter", "payment", "admin"], 
            required: true 
        },
        previousStatus: { 
            type: String, 
            enum: ["active", "blocked", "suspended"], 
            required: true 
        },
        newStatus: { 
            type: String, 
            enum: ["active", "blocked", "suspended"], 
            required: true 
        },
    },
    { timestamps: true }
);

accessLogSchema.index({ createdAt: -1 });

export const AccessLog: Model<IAccessLog> =
    mongoose.models.AccessLog || mongoose.model<IAccessLog>("AccessLog", accessLogSchema);
