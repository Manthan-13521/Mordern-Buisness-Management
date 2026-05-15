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
import mongoose from "mongoose";
import { AuthUser } from "./authHelper";

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

// We use AuthUser from authHelper as the canonical type

/**
 * Returns a MongoDB query filter scoped to the authenticated user's pool.
 *
 * - superadmin → `{}` (no filter; sees all tenants)
 * - admin/staff → `{ poolId: user.poolId }` (strictly scoped)
 *
 * Throws `TenantIsolationError` if a non-superadmin has no poolId —
 * this prevents leaking data from other tenants via an empty filter.
 */
export function getTenantFilter(user: AuthUser): Record<string, string> {
    if (user.role === "superadmin") {
        return {};
    }

    requirePoolId(user);
    return { poolId: user.poolId! };
}

export function validateTenantAccess(user: AuthUser, tenantId: string, type: "pool" | "hostel" | "business"): boolean {
    if (user.role === "superadmin") return true;

    const userTenantId = type === "pool" ? user.poolId : type === "hostel" ? user.hostelId : user.businessId;

    if (!userTenantId || userTenantId !== tenantId) {
        logger.error(`SECURITY: Tenant mismatch detected for ${type}`, {
            userId: user.id,
            userTenantId,
            requestedTenantId: tenantId,
            role: user.role
        });
        return false;
    }

    return true;
}

export function requireTenant(user?: AuthUser | null): string {
    if (!user) {
        logger.warn("SECURITY: Attempted access without authenticated user session");
        throw new Error("Unauthorized");
    }

    if (user.role === "superadmin") return "superadmin";

    // Check for ANY valid tenant scope (business → hostel → pool)
    const tenantId = user.businessId || user.hostelId || user.poolId;
    
    // DEFENSIVE ASSERTION: Fail-closed if no tenant ID is present for non-superadmin
    if (!tenantId || typeof tenantId !== "string" || tenantId.trim() === "") {
        logger.error("SECURITY CRITICAL: Non-superadmin user has no tenant scope in session", {
            userId: user.id,
            role: user.role,
        });
        throw new Error("Access Denied: Your account is not properly assigned to a tenant.");
    }

    return tenantId;
}

/**
 * Ensures that a query filter ALWAYS contains a tenant identifier if the user is not a superadmin.
 * This is the ultimate "Golden Rule" enforcement at the query builder level.
 */
export function enforceFilterScoping(filter: Record<string, any>, user: AuthUser): Record<string, any> {
    if (user.role === "superadmin") return filter;

    const tenantId = user.businessId || user.hostelId || user.poolId;
    
    if (!tenantId) {
        logger.error("SECURITY CRITICAL: enforceFilterScoping failed - no tenantId in session", { userId: user.id });
        throw new Error("Security Violation: Cannot execute unscoped query.");
    }

    // Determine the likely field name based on user context
    const fieldName = user.poolId ? "poolId" : user.hostelId ? "hostelId" : "businessId";
    
    // If the filter already has a different tenantId, it might be a cross-tenant attack or bug
    if (filter[fieldName] && filter[fieldName] !== tenantId) {
        logger.error("SECURITY CRITICAL: Filter tenantId mismatch", {
            userId: user.id,
            filterValue: filter[fieldName],
            sessionValue: tenantId
        });
        throw new Error("Security Violation: Accessing unauthorized tenant data.");
    }

    return { ...filter, [fieldName]: tenantId };
}

export function requireBusinessId(user?: AuthUser | null): string {
    if (!user) throw new Error("Unauthorized");

    const businessId = user.businessId;

    if (user.role !== "superadmin") {
        if (!businessId || typeof businessId !== "string" || businessId.trim() === "") {
            logger.error("SECURITY: Missing or invalid businessId access attempt", {
                userId: user.id || "unknown",
            });
            throw new Error("Invalid or missing businessId");
        }
    }

    return businessId || "superadmin";
}

export function requirePoolId(user: AuthUser): asserts user is AuthUser & { poolId: string } {
    if (!user.poolId && user.role !== "superadmin") {
        throw new TenantIsolationError(user.id, user.role, "Strict tenant scope required but session lacks poolId.");
    }
}

export function resolvePoolId(user: AuthUser, bodyPoolId?: string): string {
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

