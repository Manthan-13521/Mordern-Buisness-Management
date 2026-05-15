/**
 * lib/auditLog.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Lightweight audit logging utility for Business SaaS financial operations.
 * 
 * Logs are structured and sent through the existing pino logger.
 * For production at scale, these can be piped to a dedicated audit store.
 *
 * USAGE:
 *   import { auditLog } from "@/lib/auditLog";
 *   auditLog.financial({ businessId, userId, action: "PAYMENT_CREATED", details: { amount, customerId } });
 * ─────────────────────────────────────────────────────────────────────────
 */

import { logger } from "@/lib/logger";

export type AuditAction =
    | "SALE_CREATED"
    | "PAYMENT_CREATED"
    | "STOCK_CREATED"
    | "STOCK_UPDATED"
    | "CUSTOMER_CREATED"
    | "CUSTOMER_DELETED"
    | "LABOUR_CREATED"
    | "LABOUR_PAYMENT"
    | "LABOUR_ADVANCE"
    | "ATTENDANCE_SYNC"
    | "INVOICE_GENERATED"
    | "RECEIPT_UPLOADED"
    | "VEHICLE_ADDED"
    | "VEHICLE_DELETED"
    | "FAILED_ACCESS"
    | "DUPLICATE_BLOCKED";

interface AuditEntry {
    businessId: string;
    userId?: string;
    action: AuditAction;
    details?: Record<string, any>;
}

export const auditLog = {
    /**
     * Log a financial/administrative action.
     * All entries are tenant-scoped and timestamped automatically.
     */
    financial(entry: AuditEntry): void {
        logger.info(`Business Audit: ${entry.action}`, {
            audit: true,
            businessId: entry.businessId,
            userId: entry.userId || "unknown",
            action: entry.action,
            details: entry.details || {},
            timestamp: new Date().toISOString(),
        }, "AUDIT");
    },

    /**
     * Log a security-relevant event (failed access, suspicious activity).
     */
    security(entry: AuditEntry): void {
        logger.warn(`Security Audit: ${entry.action}`, {
            audit: true,
            businessId: entry.businessId,
            userId: entry.userId || "unknown",
            action: entry.action,
            details: entry.details || {},
            timestamp: new Date().toISOString(),
        });
    },

    /**
     * Log a slow query or performance issue.
     */
    performance(businessId: string, route: string, durationMs: number): void {
        if (durationMs > 3000) {
            logger.warn(`Slow Query: ${route}`, {
                audit: true,
                businessId,
                route,
                durationMs,
                timestamp: new Date().toISOString(),
            });
        }
    },
};

