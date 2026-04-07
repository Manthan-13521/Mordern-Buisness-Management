import pino from "pino";

// ── 4.1 Production Grade Pino Setup ──────────────────────────────────────────
export const pinoLogger = pino({
    level: process.env.NODE_ENV === "production" ? "info" : "debug",
    base: { env: process.env.NODE_ENV },
    timestamp: () => `,"time":"${new Date().toISOString()}"`,
    transport: process.env.NODE_ENV === "development" ? {
        target: "pino-pretty",
        options: { colorize: true }
    } : undefined
});

// ── Structured audit event types ─────────────────────────────────────────
export type AuditEventType =
    | "PAYMENT_SUCCESS"
    | "PAYMENT_FAILED"
    | "PAYMENT_DUPLICATE"
    | "LOGIN_SUCCESS"
    | "LOGIN_FAILED"
    | "LOGIN_LOCKED"
    | "MEMBER_CREATED"
    | "MEMBER_DELETED"
    | "PLAN_CREATED"
    | "PLAN_UPDATED"
    | "PLAN_DELETED"
    | "ENTRY_GRANTED"
    | "ENTRY_DENIED"
    | "RATE_LIMIT_HIT"
    | "ABUSE_DETECTED"
    | "CSRF_FAILED"
    | "BACKUP_CREATED"
    | "ADMIN_ACTION"
    | "PASSWORD_RESET_REQUESTED"
    | "PASSWORD_RESET_FAILED"
    | "PASSWORD_RESET_SUCCESS"
    | "TENANT_ISOLATION_VIOLATION"
    // ── Subscription ───────────────────────────────────────────
    | "SUBSCRIPTION_ACTIVATED"
    | "SUBSCRIPTION_PAYMENT_FAILED"
    | "SUBSCRIPTION_WEBHOOK_INVALID_SIG";

interface AuditEvent {
    type: AuditEventType;
    userId?: string;
    poolId?: string;
    ip?: string;
    meta?: Record<string, unknown>;
}

/**
 * Backward-compatible wrapper exposing pino while honoring existing API paths
 */
export const logger = {
    info(message: string, meta?: object) {
        pinoLogger.info(meta || {}, message);
    },
    warn(message: string, meta?: object) {
        pinoLogger.warn(meta || {}, message);
    },
    error(message: string, meta?: object) {
        pinoLogger.error(meta || {}, message);
    },
    scan(message: string, meta?: object) {
        // Keeping as info level logic internally but tagged as "scan" event
        pinoLogger.info({ category: "SCAN", ...meta }, message);
    },

    /**
     * Structured audit log for security-sensitive events.
     */
    audit(event: AuditEvent) {
        pinoLogger.info({
            category: "AUDIT", 
            type: event.type,
            userId: event.userId,
            poolId: event.poolId,
            ip: event.ip,
            ...event.meta
        }, `Audit: ${event.type}`);
    },
};
