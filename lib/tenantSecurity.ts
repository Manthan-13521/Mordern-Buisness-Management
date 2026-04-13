import { logger } from "@/lib/logger";
import { AuthUser } from "./authHelper";

interface SecureQueryOptions {
    select?: string;
    populate?: string | any;
    lean?: boolean;
}

/**
 * Validates cross-tenant access internally for logging purposes.
 * This function handles the advanced security boost: Detect Tampering Attempts.
 */
export async function auditCrossTenantAccess(model: any, id: string, user: AuthUser) {
    if (user.role === "superadmin") return;
    try {
        const item = await model.findById(id).select("poolId").lean() as any;
        if (item && item.poolId !== user.poolId) {
            logger.audit({
                type: "TENANT_ISOLATION_VIOLATION",
                userId: user.id || "unknown",
                poolId: user.poolId || "unknown",
                meta: {
                    message: "CROSS_TENANT_ACCESS_ATTEMPT",
                    targetId: id,
                    targetModel: model.modelName,
                    targetPoolId: item.poolId,
                }
            });
        }
    } catch {
        // Ignore internal errors on detection logic (e.g. invalid object ID format)
    }
}

export async function secureFindById(model: any, id: string, user: AuthUser, opts: SecureQueryOptions = {}) {
    let query = user.role === "superadmin" 
        ? model.findById(id) 
        : model.findOne({ _id: id, poolId: user.poolId });

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
    let query = user.role === "superadmin" 
        ? model.findByIdAndUpdate(id, updateData, { returnDocument: 'after' }) 
        : model.findOneAndUpdate({ _id: id, poolId: user.poolId }, updateData, { returnDocument: 'after' });

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
    let query = user.role === "superadmin" 
        ? model.findByIdAndDelete(id) 
        : model.findOneAndDelete({ _id: id, poolId: user.poolId });

    const result = await query.lean();

    if (!result && user.role !== "superadmin") {
        await auditCrossTenantAccess(model, id, user);
    }

    return result as any;
}
