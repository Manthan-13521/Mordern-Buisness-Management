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

export function requireTenant(user?: AuthUser | null): string {
    if (!user) throw new Error("Unauthorized");

    if (user.role === "superadmin") return "superadmin";

    // Check for ANY valid tenant scope (business → hostel → pool)
    const tenantId = user.businessId || user.hostelId || user.poolId;
    if (!tenantId || typeof tenantId !== "string" || tenantId.trim() === "") {
        console.error("SECURITY: No tenant scope found", {
            userId: user.id || "unknown",
            role: user.role,
            poolId: user.poolId, hostelId: user.hostelId, businessId: user.businessId
        });
        throw new Error("Invalid or missing tenant assignment");
    }

    return tenantId;
}

export function requireBusinessId(user?: AuthUser | null): string {
    if (!user) throw new Error("Unauthorized");

    const businessId = user.businessId;

    if (user.role !== "superadmin") {
        if (!businessId || typeof businessId !== "string" || businessId.trim() === "") {
            console.error("SECURITY: Missing or invalid businessId access attempt", {
                userId: user.id || "unknown",
                providedId: businessId
            });
            throw new Error("Invalid or missing businessId");
        }
    }

    return businessId || "superadmin";
}

export function requirePoolId(user: AuthUser): asserts user is AuthUser & { poolId: string } {
    if (!user.poolId) {
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

