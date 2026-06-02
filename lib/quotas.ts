import { NextResponse } from "next/server";
import { AuthUser } from "@/lib/authHelper";
import mongoose from "mongoose";

export const TRIAL_LIMITS = {
    pool: { members: 20, plans: 4, twilio: false },
    hostel: { members: 20, blocks: 2, floorsPerBlock: 4, roomsPerFloor: 4, plans: 4, twilio: false },
    business: { customers: 10, recordsPerCustomer: 50, invoices: 10, staff: 5, twilio: false }
};

type ModuleType = "pool" | "hostel" | "business";

export function isTrial(user: AuthUser): boolean {
    // AuthUser.subscriptionStatus is derived from subscription.expiryDate:
    //   "active" = paid & not expired, "expired" = paid & past expiry, "none" = never subscribed (free trial)
    // The Pool/Hostel model has "trial" on its own subscriptionStatus, but that value
    // is never propagated to the JWT. "none" is the correct indicator of a trial user.
    return user.subscriptionStatus === "none" && user.role !== "superadmin";
}

/**
 * Enforces quota for a specific resource type.
 * Throws an error if quota is exceeded.
 */
export async function enforceQuota(
    user: AuthUser, 
    module: ModuleType, 
    resource: keyof typeof TRIAL_LIMITS["pool"] | keyof typeof TRIAL_LIMITS["hostel"] | keyof typeof TRIAL_LIMITS["business"], 
    modelName: string, 
    query: Record<string, any>
) {
    if (!isTrial(user)) return; // bypass for paid/admins

    const limit = (TRIAL_LIMITS[module] as any)[resource];
    if (typeof limit !== "number") return;

    const count = await mongoose.models[modelName].countDocuments(query);
    if (count >= limit) {
        throw new Error(`QUOTA_EXCEEDED:${resource}`);
    }
}

/**
 * Returns a standardized NextResponse for Quota Exceeded.
 */
export function quotaExceededResponse(resource: string) {
    return NextResponse.json(
        { 
            error: "QUOTA_EXCEEDED", 
            message: `Free trial limit reached for ${resource}. Please upgrade your plan to create more.`,
            resource
        }, 
        { 
            status: 403, 
            headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } 
        }
    );
}

/**
 * Checks if Twilio/WhatsApp integration is allowed.
 * Returns true if allowed, false if blocked by trial.
 */
export function isTwilioAllowed(user: AuthUser): boolean {
    if (!isTrial(user)) return true;
    return false; // all trials block twilio
}
