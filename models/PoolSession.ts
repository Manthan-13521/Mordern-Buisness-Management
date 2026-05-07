import mongoose, { Document, Model, Schema } from "mongoose";

export interface IPoolSession extends Document {
    memberId?: mongoose.Types.ObjectId;
    poolId?: string;
    numPersons: number;
    entryTime: Date;
    expiryTime: Date;
    status: "active" | "completed";
    createdAt: Date;
    updatedAt: Date;
}

const poolSessionSchema = new Schema<IPoolSession>(
    {
        memberId: { type: Schema.Types.ObjectId, ref: "Member", index: true },
        poolId: { type: String, index: true },
        numPersons: { type: Number, required: true, default: 1 },
        entryTime: { type: Date, default: Date.now, index: true },
        expiryTime: { type: Date, required: true, index: true },
        status: { type: String, enum: ["active", "completed"], default: "active", index: true },
    },
    { timestamps: true }
);

// Compound indexes for occupancy aggregation and cleanup queries
poolSessionSchema.index({ poolId: 1, status: 1 }); // Occupancy aggregate: { poolId, status: "active" }
poolSessionSchema.index({ status: 1, expiryTime: 1 }); // Cleanup: find expired active sessions

export const PoolSession: Model<IPoolSession> =
    mongoose.models.PoolSession || mongoose.model<IPoolSession>("PoolSession", poolSessionSchema);
