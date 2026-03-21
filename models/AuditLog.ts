import mongoose, { Document, Model, Schema } from "mongoose";

export interface IAuditLog extends Document {
    action: string;
    entity: string;
    entityId: string;
    performedBy: string;
    details?: string;
    createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
    {
        action: { type: String, required: true },
        entity: { type: String, required: true },
        entityId: { type: String, required: true },
        performedBy: { type: String, required: true },
        details: { type: String },
        createdAt: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

auditLogSchema.index({ entityId: 1 });
auditLogSchema.index({ createdAt: -1 });

export const AuditLog: Model<IAuditLog> =
    mongoose.models.AuditLog || mongoose.model<IAuditLog>("AuditLog", auditLogSchema);
