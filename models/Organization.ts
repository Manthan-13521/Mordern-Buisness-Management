import mongoose, { Document, Model, Schema } from "mongoose";

export interface IOrganization extends Document {
    name: string;
    ownerId: mongoose.Types.ObjectId;  // Ref to User who owns the org
    planId: mongoose.Types.ObjectId;   // Ref to SaaSPlan
    poolIds: string[];                 // Linked sub-tenants (pools assigned to this org)
    hostelIds: string[];               // Linked sub-tenants (hostels assigned to this org)
    
    status: "trial" | "active" | "expired" | "grace";
    trialEndsAt?: Date;
    currentPeriodEnd?: Date;
    graceEndsAt?: Date;
    
    // Referral Tracking
    referralCodeUsed?: string;
    discountApplied?: number;
    
    isSuperAdmin: boolean;             // System-wide super-admin flag
    createdAt: Date;
    updatedAt: Date;
}

const organizationSchema = new Schema<IOrganization>(
    {
        name: { type: String, required: true },
        ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
        planId: { type: Schema.Types.ObjectId, ref: "SaaSPlan", required: true },
        poolIds: { type: [String], default: [], index: true },
        hostelIds: { type: [String], default: [], index: true },
        
        status: { 
            type: String, 
            enum: ["trial", "active", "expired", "grace"], 
            default: "trial",
            index: true
        },
        trialEndsAt: { type: Date },
        currentPeriodEnd: { type: Date },
        graceEndsAt: { type: Date },
        
        isSuperAdmin: { type: Boolean, default: false },
        
        // Referral metrics
        referralCodeUsed: { type: String, trim: true, uppercase: true },
        discountApplied: { type: Number, default: 0 }
    },
    { timestamps: true }
);

organizationSchema.index({ status: 1, currentPeriodEnd: 1 });

export const Organization: Model<IOrganization> =
    mongoose.models.Organization || mongoose.model<IOrganization>("Organization", organizationSchema);
