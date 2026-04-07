/**
 * lib/tenant.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Central tenant isolation helper for AquaSync multi-tenant SaaS.
 *
 * USAGE:
 *   import { getTenantFilter, requirePoolId } from "@/lib/tenant";
 *
 *   // In a GET handler:
 *   const filter = getTenantFilter(session.user);
 *   const members = await Member.find({ ...filter, isDeleted: false });
 *
 *   // To guard a non-superadmin route that strictly requires a pool:
 *   requirePoolId(session.user); // throws TenantIsolationError if missing
 *
 * RULES:
 *   - superadmin: no poolId filter applied (sees everything)
 *   - admin/staff: poolId MUST be present — error thrown otherwise
 *   - Never trust frontend-supplied poolId; always read from session
 * ─────────────────────────────────────────────────────────────────────────
 */

import { logger } from "@/lib/logger";

export class TenantIsolationError extends Error {
    readonly statusCode = 400;
    constructor(userId?: string, role?: string, message = "Pool ID is missing from session. Cannot perform tenant-scoped query.") {
        super(message);
        this.name = "TenantIsolationError";

        // Generate an audit log entry for this potential security violation
        logger.audit({
            type: "TENANT_ISOLATION_VIOLATION",
            userId: userId || "unknown",
            meta: { role, error: message },
        });
    }
}

export interface SessionUser {
    id?: string;
    role?: string;
    poolId?: string | null;
}

/**
 * Returns a MongoDB query filter scoped to the authenticated user's pool.
 *
 * - superadmin → `{}` (no filter; sees all tenants)
 * - admin/staff → `{ poolId: user.poolId }` (strictly scoped)
 *
 * Throws `TenantIsolationError` if a non-superadmin has no poolId —
 * this prevents leaking data from other tenants via an empty filter.
 */
export function getTenantFilter(user: SessionUser): Record<string, string> {
    if (user.role === "superadmin") {
        // Superadmin intentionally sees all — no pool filter applied
        return {};
    }

    requirePoolId(user);
    return { poolId: user.poolId! };
}

/**
 * Asserts that the session user has a valid poolId.
 * Call this at the top of any route that MUST be tenant-scoped.
 *
 * Throws `TenantIsolationError` (HTTP 400) if poolId is falsy.
 */
export function requirePoolId(user: SessionUser): asserts user is SessionUser & { poolId: string } {
    if (!user.poolId) {
        throw new TenantIsolationError(user.id, user.role, "Strict tenant scope required but session lacks poolId.");
    }
}

/**
 * Safely resolves the poolId for a write operation:
 *  - non-superadmin → always returns session poolId (ignores body)
 *  - superadmin     → uses body.poolId (must be provided by caller)
 *
 * Throws if the result is falsy.
 */
export function resolvePoolId(user: SessionUser, bodyPoolId?: string): string {
    const poolId = user.role === "superadmin" ? bodyPoolId : user.poolId;
    if (!poolId) {
        throw new TenantIsolationError(
            user.id,
            user.role,
            user.role === "superadmin"
                ? "Superadmin must supply poolId in request body for creation/writes."
                : "Pool ID is missing from session for tenant-scoped write operation."
        );
    }
    return poolId;
}

