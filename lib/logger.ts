import pino from "pino";

// ── Log Sampling for Production ──────────────────────────────────────────────
// Under heavy load, even info logs become I/O noise.
// error/warn: ALWAYS | payment/auth context: ALWAYS | info: 20% | debug: 5%
function shouldSample(level: string, context?: string): boolean {
    if (level === "error" || level === "warn" || level === "fatal") return true;
    if (context === "payment" || context === "auth" || context === "AUDIT") return true;
    if (process.env.NODE_ENV !== "production") return true;
    const rate = level === "info" ? 0.2 : 0.05;
    return Math.random() < rate;
}

// ── 4.1 Production Grade Pino Setup ──────────────────────────────────────────
export const pinoLogger = pino({
    level: process.env.NODE_ENV === "production" ? "warn" : "debug",
    base: { env: process.env.NODE_ENV },
    // Redact PII fields from all log output (GDPR + security)
    redact: {
        paths: ["email", "phone", "name", "*.email", "*.phone", "*.name", "meta.phone", "meta.email"],
        censor: "[REDACTED]",
    },
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
    | "SUBSCRIPTION_WEBHOOK_INVALID_SIG"
    | "SUBSCRIPTION_AMOUNT_MISMATCH";

interface AuditEvent {
    type: AuditEventType;
    userId?: string;
    poolId?: string;
    ip?: string;
    meta?: Record<string, unknown>;
}

/**
 * Backward-compatible wrapper with request-level sampling.
 * error/warn: ALWAYS logged. info/debug: sampled in production.
 * Payment + auth events: ALWAYS logged regardless of level.
 */
export const logger = {
    info(message: string, meta?: object, context?: string) {
        if (shouldSample("info", context)) {
            pinoLogger.info(meta || {}, message);
        }
    },
    warn(message: string, meta?: object) {
        pinoLogger.warn(meta || {}, message);
    },
    error(message: string, meta?: object) {
        pinoLogger.error(meta || {}, message);
    },
    debug(message: string, meta?: object, context?: string) {
        if (shouldSample("debug", context)) {
            pinoLogger.debug(meta || {}, message);
        }
    },
    scan(message: string, meta?: object) {
        if (shouldSample("info")) {
            pinoLogger.info({ category: "SCAN", ...meta }, message);
        }
    },

    /**
     * Structured audit log for security-sensitive events.
     * ALWAYS logged — never sampled, uses warn level to survive production filter.
     */
    audit(event: AuditEvent) {
        pinoLogger.warn({
            category: "AUDIT", 
            type: event.type,
            userId: event.userId,
            poolId: event.poolId,
            ip: event.ip,
            ...event.meta
        }, `Audit: ${event.type}`);
    },
};
