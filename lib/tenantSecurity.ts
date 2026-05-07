import { logger } from "@/lib/logger";
import { AuthUser } from "./authHelper";

interface SecureQueryOptions {
    select?: string;
    populate?: string | any;
    lean?: boolean;
}

/**
 * Resolves the correct tenant scope filter based on user type.
 * - superadmin: no filter (sees everything)
 * - business_admin: scopes by businessId
 * - hostel_admin: scopes by hostelId
 * - pool admin/operator: scopes by poolId
 */
function getTenantScope(user: AuthUser): Record<string, string> {
    if (user.role === "superadmin") return {};
    if (user.businessId) return { businessId: user.businessId };
    if (user.hostelId) return { hostelId: user.hostelId };
    if (user.poolId) return { poolId: user.poolId };
    // Fallback: impossible tenant match to prevent data leaks
    return { poolId: "__no_tenant__" };
}

/**
 * Validates cross-tenant access internally for logging purposes.
 * This function handles the advanced security boost: Detect Tampering Attempts.
 */
export async function auditCrossTenantAccess(model: any, id: string, user: AuthUser) {
    if (user.role === "superadmin") return;
    try {
        const item = await model.findById(id).select("poolId hostelId businessId").lean() as any;
        if (!item) return;
        // Check if the item belongs to a different tenant
        const scope = getTenantScope(user);
        const scopeKey = Object.keys(scope)[0];
        if (scopeKey && item[scopeKey] !== scope[scopeKey]) {
            logger.audit({
                type: "TENANT_ISOLATION_VIOLATION",
                userId: user.id || "unknown",
                poolId: user.poolId || "unknown",
                meta: {
                    message: "CROSS_TENANT_ACCESS_ATTEMPT",
                    targetId: id,
                    targetModel: model.modelName,
                    scopeKey,
                    userValue: scope[scopeKey],
                    targetValue: item[scopeKey],
                }
            });
        }
    } catch {
        // Ignore internal errors on detection logic (e.g. invalid object ID format)
    }
}

export async function secureFindById(model: any, id: string, user: AuthUser, opts: SecureQueryOptions = {}) {
    const scope = getTenantScope(user);
    let query = Object.keys(scope).length === 0
        ? model.findById(id)
        : model.findOne({ _id: id, ...scope });

    if (opts.select) query = query.select(opts.select);
    if (opts.populate) query = query.populate(opts.populate);
    if (opts.lean !== false) query = query.lean();

    const result = await query;

    if (!result && user.role !== "superadmin") {
        await auditCrossTenantAccess(model, id, user);
    }

    return result as any;
}

export async function secureUpdateById(model: any, id: string, updateData: any, user: AuthUser, opts: SecureQueryOptions = {}) {
    const scope = getTenantScope(user);
    let query = Object.keys(scope).length === 0
        ? model.findByIdAndUpdate(id, updateData, { returnDocument: 'after' })
        : model.findOneAndUpdate({ _id: id, ...scope }, updateData, { returnDocument: 'after' });

    if (opts.select) query = query.select(opts.select);
    if (opts.populate) query = query.populate(opts.populate);
    if (opts.lean !== false) query = query.lean();

    const result = await query;

    if (!result && user.role !== "superadmin") {
        await auditCrossTenantAccess(model, id, user);
    }

    return result as any;
}

export async function secureDeleteById(model: any, id: string, user: AuthUser) {
    const scope = getTenantScope(user);
    let query = Object.keys(scope).length === 0
        ? model.findByIdAndDelete(id)
        : model.findOneAndDelete({ _id: id, ...scope });

    const result = await query.lean();

    if (!result && user.role !== "superadmin") {
        await auditCrossTenantAccess(model, id, user);
    }

    return result as any;
}

