import { dbConnect } from "@/lib/mongodb";
import { Organization } from "@/models/Organization";
import { SaaSPlan } from "@/models/SaaSPlan";
import { Member } from "@/models/Member";
import { Pool } from "@/models/Pool";
import { redis } from "@/lib/redis";

/**
 * ── SaaS Guard: Business Logic Enforcer ────────────────────────────────
 */

export interface SaaSContext {
    orgId: string;
    planId: string;
    features: {
        analytics: boolean;
        whatsapp: boolean;
        autoBlock: boolean;
        prioritySupport: boolean;
    };
    maxMembers: number;
    status: "trial" | "active" | "expired" | "grace";
    isHardExpired: boolean;
}

/**
 * Validates the tenant SaaS subscription state, returning strict context.
 * Useful for APIs that mutate state or grant gated UI access.
 */
export async function enforceSaaSGuard(poolId: string): Promise<SaaSContext> {
    // 1. To use Key: org:{orgId}:plan we first need the orgId. 
    // We use a lightweight pool->org mapping cache to quickly resolve orgId.
    let orgIdToFetch = "";
    const poolMapKey = `saasGuard:poolMap:${poolId}`;
    
    if (redis) {
        try {
            const cachedOrgId = await redis.get(poolMapKey);
            if (cachedOrgId && typeof cachedOrgId === 'string') {
                orgIdToFetch = cachedOrgId;
            }
        } catch (e) {
            console.warn("[SaaSGuard] Redis pool lookup failed:", e);
        }
    }

    if (!orgIdToFetch) {
        await dbConnect();
        const orgMapping = await Organization.findOne({ poolIds: poolId }).select("_id").lean();
        if (orgMapping) {
            orgIdToFetch = (orgMapping._id as any).toString();
            if (redis) {
                try {
                    await redis.setex(poolMapKey, 86400, orgIdToFetch); // Cache mapping for 24h
                } catch (e) {
                    console.warn("[SaaSGuard] Redis set poolMap failed:", e);
                }
            }
        } else {
            orgIdToFetch = "LEGACY_TRANSITION";
        }
    }

    const cacheKey = `org:${orgIdToFetch}:plan`;

    // 1. Try Redis cache safely
    if (redis) {
        try {
            const cached = await redis.get(cacheKey);
            // Some redis clients return string, some return JSON object. Handle both safely:
            if (cached) {
                return typeof cached === "string" ? JSON.parse(cached) : cached as SaaSContext;
            }
        } catch (e) {
            console.warn("[SaaSGuard] Redis lookup failed, falling back to DB:", e);
        }
    }

    // 2. Fallback to Mongo DB
    await dbConnect();
    
    let context: SaaSContext;

    if (orgIdToFetch === "LEGACY_TRANSITION") {
        // Find Pool to get owner (admin config fallback) or if missing, throw.
        const pool = await Pool.findOne({ poolId }).lean();
        if (!pool) throw new Error("Tenant lookup failed (Pool not found)");

        // Mock a transitional grace context to avoid breaking existing users during migration
        context = {
            orgId: "LEGACY_TRANSITION",
            planId: "LEGACY",
            features: {
                analytics: true,
                whatsapp: true,
                autoBlock: true,
                prioritySupport: false
            },
            maxMembers: 9999, // Unbounded legacy tolerance
            status: "active",
            isHardExpired: false
        };
    } else {
        const org = await Organization.findById(orgIdToFetch).populate("planId").lean();
        if (!org) throw new Error("SaaS_Org_Not_Found");
        
        const planObj: any = org.planId;
        
        // We do NOT throw here automatically anymore, to allow read-only dashboard access.
        // Instead we throw when specific write operations are requested.
        const isHardExpired = org.status === "expired" && (!org.graceEndsAt || Date.now() > new Date(org.graceEndsAt).getTime());

        context = {
            orgId: (org._id as any).toString(),
            planId: planObj._id.toString(),
            features: planObj.features,
            maxMembers: planObj.maxMembers,
            status: org.status,
            isHardExpired
        };
    }

    // 3. Cache the DB result for 30 mins to avoid stale plans
    if (redis) {
        try {
            await redis.setex(cacheKey, 1800, JSON.stringify(context));
        } catch (e) {
            console.warn("[SaaSGuard] Redis set failed:", e);
        }
    }

    return context;
}

/**
 * Specific Limit Enforcer: Member Count
 */
export async function enforceMemberCreationLimit(poolId: string) {
    const context = await enforceSaaSGuard(poolId);
    
    // 1) Hard Kill Switch — Do not let expired orgs create data forever
    if (context.isHardExpired) {
        throw new Error("SaaS_Subscription_Expired");
    }

    // Bypassing for legacy transitioners
    if (context.orgId === "LEGACY_TRANSITION") return true;

    const currentCount = await Member.countDocuments({ poolId });
    
    // 2) Anti-Cheat Snapshot: Enforce against max(currentMembers, peakMembers)
    const { OrgUsage } = await import("@/models/OrgUsage");
    const usage = await OrgUsage.findOneAndUpdate(
        { orgId: context.orgId },
        { $max: { peakMembers: currentCount } },
        { new: true, upsert: true }
    );
    
    const peak = usage?.peakMembers || currentCount;
    const effectiveCount = Math.max(currentCount, peak);

    if (effectiveCount >= context.maxMembers) {
        throw new Error("SaaS_Member_Limit_Reached");
    }
    
    // Account for the new member about to be added
    await OrgUsage.updateOne(
        { orgId: context.orgId },
        { $max: { peakMembers: currentCount + 1 } }
    );
    
    return true;
}

/**
 * Specific Feature Enforcer: Analytics
 */
export async function enforceAnalyticsAccess(poolId: string) {
    const context = await enforceSaaSGuard(poolId);
    if (!context.features.analytics) {
        throw new Error("SaaS_Feature_Gated_Analytics");
    }
    return true;
}

/**
 * Validates any mutating operation (like receiving a payment or creating non-member entities)
 */
export async function enforceWriteAccess(poolId: string) {
    const context = await enforceSaaSGuard(poolId);
    if (context.isHardExpired) {
        throw new Error("SaaS_Subscription_Expired");
    }
    return true;
}
