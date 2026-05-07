import { dbConnect } from "@/lib/mongodb";
import { Organization } from "@/models/Organization";
import { SaaSPlan } from "@/models/SaaSPlan";
import { Member } from "@/models/Member";
import { Pool } from "@/models/Pool";
import { redis } from "@/lib/redis";
import { logger } from "@/lib/logger";

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
            logger.warn("[SaaSGuard] Redis pool lookup failed");
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
                    logger.warn("[SaaSGuard] Redis set poolMap failed");
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
            logger.warn("[SaaSGuard] Redis lookup failed, falling back to DB");
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
            logger.warn("[SaaSGuard] Redis set failed");
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

// ═══════════════════════════════════════════════════════════════════════════════
// BUSINESS SaaS Guard — Uses User.subscription (not Organization model)
// ═══════════════════════════════════════════════════════════════════════════════

export interface BusinessSaaSContext {
    businessId: string;
    userId: string;
    module: "business";
    planType: string;
    status: "active" | "trial" | "expired" | "suspended" | "cancelled";
    expiryDate: Date;
    isExpired: boolean;
    isGracePeriod: boolean; // 7-day grace after expiry
}

/**
 * Check subscription status for business tenants.
 * Business tenants store subscription directly on User model (not Organization).
 * Uses Redis cache with 15min TTL to avoid hitting User collection on every request.
 */
export async function enforceBusinessSubscription(
    userId: string,
    businessId: string
): Promise<BusinessSaaSContext> {
    const cacheKey = `biz:sub:${businessId}`;

    // 1. Try Redis cache
    if (redis) {
        try {
            const cached = await redis.get(cacheKey);
            if (cached) {
                const ctx = typeof cached === "string" ? JSON.parse(cached) : cached as BusinessSaaSContext;
                // Re-check expiry against current time (cache may be up to 15min stale)
                ctx.isExpired = new Date(ctx.expiryDate).getTime() < Date.now();
                ctx.isGracePeriod = ctx.isExpired &&
                    (Date.now() - new Date(ctx.expiryDate).getTime()) < 7 * 24 * 60 * 60 * 1000;
                return ctx;
            }
        } catch (e) {
            // Non-fatal — fall through to DB
        }
    }

    // 2. Load from DB
    await dbConnect();
    const { User } = await import("@/models/User");
    const user = await User.findById(userId).select("subscription businessId").lean() as any;

    if (!user) throw new Error("SaaS_User_Not_Found");

    const sub = user.subscription;
    if (!sub || sub.module !== "business") {
        // No active business subscription — allow trial-like access
        const ctx: BusinessSaaSContext = {
            businessId,
            userId,
            module: "business",
            planType: "none",
            status: "expired",
            expiryDate: new Date(0),
            isExpired: true,
            isGracePeriod: false,
        };
        return ctx;
    }

    const expiryDate = new Date(sub.expiryDate);
    const isExpired = expiryDate.getTime() < Date.now();
    const gracePeriodMs = 7 * 24 * 60 * 60 * 1000; // 7 days
    const isGracePeriod = isExpired && (Date.now() - expiryDate.getTime()) < gracePeriodMs;

    const ctx: BusinessSaaSContext = {
        businessId,
        userId,
        module: "business",
        planType: sub.planType,
        status: isExpired ? "expired" : (sub.status as any),
        expiryDate,
        isExpired,
        isGracePeriod,
    };

    // 3. Cache for 15 minutes
    if (redis) {
        try {
            await redis.setex(cacheKey, 900, JSON.stringify(ctx));
        } catch (e) {
            // Non-fatal
        }
    }

    return ctx;
}

/**
 * Enforce write access for business tenants.
 * Throws if subscription is hard-expired (past 7-day grace period).
 * Allows reads during grace period but blocks writes.
 */
export async function enforceBusinessWriteAccess(
    userId: string,
    businessId: string
): Promise<true> {
    const ctx = await enforceBusinessSubscription(userId, businessId);

    // Hard expired = past grace period, no writes allowed
    if (ctx.isExpired && !ctx.isGracePeriod) {
        throw new Error("SaaS_Business_Subscription_Expired");
    }

    return true;
}

