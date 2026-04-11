import mongoose, { Document, Model, Schema } from "mongoose";
import crypto from "crypto";

export interface IEquipmentItem {
    itemName: string;
    issuedDate: Date;
    returnedDate?: Date;
    isReturned: boolean;
}

export interface IMember extends Document {
    organizationId?: string; // Prompt 0.1 Partion Key
    memberId: string;
    poolId: string;
    name: string;
    phone: string;
    age?: number;
    dob?: Date;
    aadharCard?: string;
    address?: string;
    photoUrl?: string;
    // Plan linkage
    planId: mongoose.Types.ObjectId;
    planQuantity: number;
    planStartDate?: Date;
    planEndDate?: Date;
    cardStatus: "pending" | "ready";
    // Kept for backward compat
    startDate?: Date;
    expiryDate?: Date;
    totalEntriesAllowed?: number;
    entriesUsed?: number;
    // Payment status
    paidAmount: number;
    balanceAmount: number;
    paymentStatus: "paid" | "partial" | "pending";
    paymentMode?: string;
    // Equipment
    equipmentTaken: IEquipmentItem[];
    // QR
    qrCodeUrl?: string;
    qrToken: string;
    lastScannedAt?: Date;
    // Lifecycle
    isActive: boolean;
    isExpired: boolean;
    expiryAlertNextDaySent?: boolean;
    expiredAt?: Date;
    isDeleted: boolean;
    deletedAt?: Date;
    deletedBy?: mongoose.Types.ObjectId;
    deleteReason?: "auto_quick" | "auto_standard" | "manual";
    // Legacy status (kept for backward compat)
    status: "active" | "expired" | "deleted";
    accessStatus: "active" | "blocked" | "suspended";
    blockedAt?: Date;
    manualOverride?: boolean;
    deletedAtLegacy?: Date;
    // ── PROMPT 1.2 Access State (Fast Entry Opt) ──
    accessState: "active" | "blocked"; // Denormalized flag from defaulter engine
    cachedBalance: number;             // Denormalized sum from ledger
    // ──────────────────────────────────────────────
    createdAt: Date;
    updatedAt: Date;
    rotateQrToken(): Promise<string>;
}

const equipmentItemSchema = new Schema<IEquipmentItem>(
    {
        itemName: { type: String, required: true },
        issuedDate: { type: Date, required: true, default: Date.now },
        returnedDate: { type: Date },
        isReturned: { type: Boolean, default: false },
    },
    { _id: true }
);

const memberSchema = new Schema<IMember>(
    {
        organizationId: { type: String, index: true }, // Prompt 0.1 Partion Key
        memberId: { type: String, required: true, index: true },
        poolId: { type: String, required: true, index: true },
        name: { type: String, required: true },
        phone: { type: String, required: true },
        age: { type: Number },
        dob: { type: Date },
        aadharCard: { type: String },
        address: { type: String },
        photoUrl: { type: String }, // Cloudinary URL only — never base64
        planId: { type: Schema.Types.ObjectId, ref: "Plan", required: true },
        planQuantity: { type: Number, default: 1 },
        planStartDate: { type: Date },
        planEndDate: { type: Date, index: true },
        // Backward compat aliases
        startDate: { type: Date },
        expiryDate: { type: Date, index: true },
        totalEntriesAllowed: { type: Number, default: 1 },
        entriesUsed: { type: Number, default: 0 },
        // Payment
        paidAmount: { type: Number, default: 0 },
        balanceAmount: { type: Number, default: 0 },
        paymentStatus: {
            type: String,
            enum: ["paid", "partial", "pending"],
            default: "pending",
        },
        paymentMode: { type: String, default: "cash" },
        // Equipment issued to member
        equipmentTaken: { type: [equipmentItemSchema], default: [] },
        // QR
        qrCodeUrl: { type: String },
        qrToken: {
            type: String,
            required: true,
            default: () => crypto.randomUUID(),
        },
        cardStatus: { 
            type: String, 
            enum: ['pending', 'ready'], 
            default: 'pending',
            index: true
        },
        lastScannedAt: { type: Date },
        // Lifecycle — new boolean model (replaces status string)
        isActive: { type: Boolean, default: true, index: true },
        isExpired: { type: Boolean, default: false, index: true },
        expiryAlertNextDaySent: { type: Boolean, default: false, index: true },
        expiredAt: { type: Date },
        isDeleted: { type: Boolean, default: false, index: true },
        deletedAt: { type: Date },
        deletedBy: { type: Schema.Types.ObjectId, ref: "User" },
        deleteReason: {
            type: String,
            enum: ["auto_quick", "auto_standard", "manual"],
        },
        // Legacy status (kept for backward compat with existing code)
        status: {
            type: String,
            enum: ["active", "expired", "deleted"],
            default: "active",
            index: true,
        },
        accessStatus: {
            type: String,
            enum: ["active", "blocked", "suspended"],
            default: "active",
            index: true
        },
        blockedAt: { type: Date },
        manualOverride: { type: Boolean, default: false },
        deletedAtLegacy: { type: Date },
        // ── PROMPT 1.2 Access State (Fast Entry Opt) ──
        accessState: {
            type: String,
            enum: ["active", "blocked"],
            default: "active",
            index: true
        },
        cachedBalance: { type: Number, default: 0 },
        // ──────────────────────────────────────────────
    },
    { timestamps: true }
);

// ── Compound indexes ──────────────────────────────────────────────────
memberSchema.index({ organizationId: 1, _id: 1 }); // Prompt 0.1 Critical Index
memberSchema.index({ organizationId: 1, qrToken: 1 }); // Prompt 0.1 Fast Entry
memberSchema.index({ poolId: 1, memberId: 1 }, { unique: true });
memberSchema.index({ poolId: 1, phone: 1 });
memberSchema.index({ poolId: 1, planId: 1 });
memberSchema.index({ poolId: 1, planEndDate: 1 });
memberSchema.index({ poolId: 1, balanceAmount: 1 });
memberSchema.index({ poolId: 1, createdAt: -1 });
memberSchema.index({ poolId: 1, isDeleted: 1, isExpired: 1 });
memberSchema.index({ poolId: 1, isDeleted: 1 });

// ── Section 2A — additional performance indexes ─────────────────────
memberSchema.index({ createdAt: -1 });
memberSchema.index(
  { name: "text", phone: "text", memberId: "text" },
  { weights: { memberId: 3, name: 2, phone: 1 } }
);
// planId standalone index removed — covered by compound index { poolId: 1, planId: 1 }
// TODO: migrate photoUrl from base64 to URL after running photo migration script

// ── Method: rotate QR token after each successful scan ───────────────
memberSchema.methods.rotateQrToken = async function () {
    this.qrToken = crypto.randomUUID();
    await this.save();
    return this.qrToken;
};

// ── Dual Write Hook for UnifiedUser (Prompt 3.1) ──────────────
async function syncToUnifiedUser(doc: any, retries = 3) {
    if (!doc) return;
    try {
        const { UnifiedUser } = await import("./UnifiedUser");
        await UnifiedUser.findOneAndUpdate(
            { originalId: doc._id.toString() },
            {
                $set: {
                    organizationId: doc.organizationId || doc.poolId, // Use poolId as org fallback
                    name: doc.name,
                    phone: doc.phone,
                    type: "pool",
                    accessState: doc.accessState || "active",
                    cachedBalance: doc.cachedBalance || 0,
                }
            },
            { upsert: true, new: true }
        );
        console.log(`UnifiedUser synced (Pool: ${doc._id})`);
    } catch (e: any) {
        console.error("Failed to sync UnifiedUser for Member:", e?.message || e);
        if (retries > 0) {
            console.log(`Retrying UnifiedUser sync for ${doc._id}... (${retries} left)`);
            setTimeout(() => syncToUnifiedUser(doc, retries - 1), 2000); // 2sec backoff
        } else {
            console.error(`[DLQ] UnifiedUser dual-write exhausted retries for ${doc._id}`);
            try {
                const { recordFailedJob } = await import("@/lib/queue");
                await recordFailedJob("sync" as any, { memberId: doc._id, type: "pool" }, e?.message || "Sync failed", 3);
            } catch (dlqErr) {
                console.error("Failed to write to DLQ:", dlqErr);
            }
        }
    }
}

memberSchema.post("save", function (doc) {
    syncToUnifiedUser(doc);
});

memberSchema.post("findOneAndUpdate", function (doc) {
    syncToUnifiedUser(doc);
});

memberSchema.post("updateOne", async function (this: any) {
    const docQuery = this.getQuery();
    const doc = await this.model.findOne(docQuery).lean();
    syncToUnifiedUser(doc);
});
// ──────────────────────────────────────────────────────────────

export const Member: Model<IMember> =
    mongoose.models.Member || mongoose.model<IMember>("Member", memberSchema);
