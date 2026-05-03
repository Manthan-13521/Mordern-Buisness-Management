import mongoose, { Document, Model, Schema } from "mongoose";

export interface IHostelMember extends Document {
    memberId: string;           // e.g. HM001
    hostelId: string;           // tenant scope — MANDATORY on every doc
    name: string;
    phone: string;
    collegeName?: string;
    photoUrl?: string;
    // Room assignment
    roomId: mongoose.Types.ObjectId;
    blockId: mongoose.Types.ObjectId;
    floorId: mongoose.Types.ObjectId;
    bedNo: number;
    // Plan (Determines initial configuration or room type, legacy compatibility)
    planId: mongoose.Types.ObjectId;
    
    // Ledger Billing System: Continuous Rent Cycle
    rent_amount: number;        // The recurring price to deduct
    due_date: Date;             // Next date when the rent should be charged
    last_rent_processed_date?: Date; // Failsafe to prevent double charging on identical days
    balance: number;            // (+) Advance, (-) Dues
    lastReminderSentAt?: Date;
    lastOverdueReminderSentAt?: Date;
    
    paymentMode: string;
    notes?: string;
    
    // Status
    isActive: boolean;
    isDeleted: boolean;
    expiryAlertNextDaySent?: boolean;
    deletedAt?: Date;
    vacated_at?: Date;
    checkInDate?: Date;
    checkoutDate?: Date;
    status: "active" | "vacated" | "deleted" | "checkout" | "defaulter";
    createdAt: Date;
    updatedAt: Date;
}

const hostelMemberSchema = new Schema<IHostelMember>(
    {
        memberId:    { type: String, required: true, index: true },
        hostelId:    { type: String, required: true, index: true },
        name:        { type: String, required: true },
        phone:       { type: String, required: true },
        collegeName: { type: String },
        photoUrl:    { type: String },
        // Room assignment
        roomId:      { type: Schema.Types.ObjectId, ref: "HostelRoom", required: true },
        blockId:     { type: Schema.Types.ObjectId, ref: "HostelBlock", required: true },
        floorId:     { type: Schema.Types.ObjectId, ref: "HostelFloor", required: true, index: true },
        bedNo:       { type: Number, required: true },
        // Plan
        planId:        { type: Schema.Types.ObjectId, ref: "HostelPlan", required: true },
        
        // Ledger Billing
        rent_amount: { type: Number, required: true, min: 0 },
        due_date:    { type: Date, required: true, index: true },
        last_rent_processed_date: { type: Date },
        balance:     { type: Number, default: 0 },
        lastReminderSentAt: { type: Date },
        lastOverdueReminderSentAt: { type: Date },
        
        paymentMode: { type: String, default: "cash" },
        notes:       { type: String },
        
        // Status
        isActive:   { type: Boolean, default: true,  index: true },
        isDeleted:  { type: Boolean, default: false, index: true },
        expiryAlertNextDaySent: { type: Boolean, default: false, index: true },
        deletedAt:  { type: Date },
        vacated_at: { type: Date },
        checkInDate: { type: Date, default: Date.now },
        checkoutDate: { type: Date },
        status: {
            type: String,
            enum: ["active", "vacated", "deleted", "checkout", "defaulter"],
            default: "active",
            index: true,
        },
    },
    { timestamps: true }
);

// Compound indexes
hostelMemberSchema.index({ hostelId: 1, memberId: 1 }, { unique: true });
hostelMemberSchema.index({ hostelId: 1, roomId: 1 });
hostelMemberSchema.index({ hostelId: 1, blockId: 1 });
hostelMemberSchema.index({ hostelId: 1, due_date: 1 }); // Important for daily cron jobs
hostelMemberSchema.index({ hostelId: 1, isDeleted: 1, status: 1 });
hostelMemberSchema.index({ hostelId: 1, isActive: 1 });
hostelMemberSchema.index({ hostelId: 1, phone: 1 });
hostelMemberSchema.index({ hostelId: 1, createdAt: -1 });
hostelMemberSchema.index(
    { name: "text", phone: "text", memberId: "text" },
    { weights: { memberId: 3, name: 2, phone: 1 } }
);

// ── Dual Write Hook for UnifiedUser (Prompt 3.1) ──────────────
// ── Dual Write Hook for UnifiedUser (Prompt 3.1) ──────────────
async function syncToUnifiedUser(doc: any) {
    if (!doc) return;
    try {
        const { UnifiedUser } = await import("./UnifiedUser");
        await UnifiedUser.findOneAndUpdate(
            { originalId: doc._id.toString() },
            {
                $set: {
                    organizationId: doc.hostelId, // HostelId acts as organization partition
                    name: doc.name,
                    phone: doc.phone,
                    type: "hostel",
                    accessState: (doc.balance && doc.balance > 0 && doc.status === "active") ? "blocked" : "active", // Conceptual mapper
                    cachedBalance: doc.balance || 0,
                }
            },
            { upsert: true, new: true }
        );
        console.log(`UnifiedUser synced (Hostel: ${doc._id})`);
    } catch (e: any) {
        console.error("Failed to sync UnifiedUser for HostelMember, enqueuing to QStash:", e?.message || e);
        try {
            const { enqueueJob } = await import("@/lib/queue");
            // Forward to QStash for background retries
            await enqueueJob("sync", { memberId: doc._id, type: "hostel", data: doc });
        } catch (queueErr) {
            console.error("Failed to enqueue sync job:", queueErr);
        }
    }
}

hostelMemberSchema.post("save", function (doc) {
    syncToUnifiedUser(doc);
});

hostelMemberSchema.post("findOneAndUpdate", function (doc) {
    syncToUnifiedUser(doc);
});

hostelMemberSchema.post("updateOne", async function (this: any) {
    const docQuery = this.getQuery();
    const doc = await this.model.findOne(docQuery).lean();
    syncToUnifiedUser(doc);
});
// ──────────────────────────────────────────────────────────────

// In Next.js, forcefully overwrite the model so schema changes take effect on HMR instead of using cached model
if (mongoose.models.HostelMember) {
    delete mongoose.models.HostelMember;
}

export const HostelMember: Model<IHostelMember> = mongoose.model<IHostelMember>("HostelMember", hostelMemberSchema);
