import CircuitBreaker from "opossum";
import { logger } from "@/lib/logger";

/**
 * Hardened Circuit Breaker Factory.
 *
 * Key fix: volumeThreshold = 5 means the breaker will NOT trip until
 * at least 5 requests have been made in the rolling window.
 * Previously, a single failure (1/1 = 100%) would trip the breaker immediately.
 *
 * errorFilter: 4xx errors (auth failures, bad config) are NOT counted
 * as circuit-tripping failures. Only 5xx / network / timeout errors count.
 * This prevents config errors from triggering a 30-second lockout.
 */

// ── Error classification ─────────────────────────────────────────────────────
function isTransientError(err: any): boolean {
    // Razorpay SDK wraps HTTP errors with statusCode
    const status = err?.statusCode || err?.status || err?.response?.status;

    // If we have a status code, only count 5xx as transient (circuit-worthy)
    if (status) {
        return status >= 500;
    }

    // Network errors (no status code) are always transient
    const msg = (err?.message || "").toLowerCase();
    if (
        msg.includes("econnrefused") ||
        msg.includes("econnreset") ||
        msg.includes("etimedout") ||
        msg.includes("socket hang up") ||
        msg.includes("network") ||
        msg.includes("timeout") ||
        msg.includes("fetch failed")
    ) {
        return true;
    }

    // Default: treat unknown errors as transient to be safe
    return true;
}

const options: CircuitBreaker.Options = {
    timeout:                  15000,  // 15s timeout (Razorpay can be slow on first cold call)
    errorThresholdPercentage: 50,     // Trip when 50% of requests fail
    resetTimeout:             30000,  // After 30s, try again (half-open)
    volumeThreshold:          5,      // ★ FIX: Need at least 5 requests before % kicks in
    rollingCountTimeout:      60000,  // 60s rolling window for error counting
    rollingCountBuckets:      6,      // 6 x 10s buckets
    errorFilter: (err: any) => {
        // Return TRUE to FILTER OUT the error (i.e. don't count it toward the threshold)
        // 4xx = config/auth error = don't trip the breaker
        return !isTransientError(err);
    },
};

// ── 4.4 Circuit Breaker Factory ──
export function createBreaker<TI extends any[], TO>(
    action: (...args: TI) => Promise<TO>,
    name: string
) {
    const breaker = new CircuitBreaker(action, options);

    breaker.on("open", () => {
        logger.warn(`[CircuitBreaker] ${name} is OPEN — failing fast for 30s. This means 5+ requests failed in the last 60s.`);
    });

    breaker.on("halfOpen", () => {
        logger.info(`[CircuitBreaker] ${name} is HALF_OPEN — testing with next request.`);
    });

    breaker.on("close", () => {
        logger.info(`[CircuitBreaker] ${name} is CLOSED — operating normally.`);
    });

    breaker.on("success", () => {
        logger.debug(`[CircuitBreaker] ${name} call succeeded.`);
    });

    breaker.on("failure", (err: any) => {
        const status = err?.statusCode || err?.status || "unknown";
        logger.warn(`[CircuitBreaker] ${name} call FAILED`, {
            statusCode: status,
            message: err?.message?.substring(0, 200),
            isTransient: isTransientError(err),
        });
    });

    breaker.on("timeout", () => {
        logger.warn(`[CircuitBreaker] ${name} call TIMED OUT (>${options.timeout}ms)`);
    });

    breaker.on("reject", () => {
        logger.warn(`[CircuitBreaker] ${name} call REJECTED — breaker is OPEN`);
    });

    // ★ FIX: NO fallback — let the real error propagate to callers.
    // The old fallback (`Promise.reject(new Error("Tripped Breaker"))`) was SWALLOWING
    // the actual Razorpay error message, making debugging impossible.
    // Callers now catch the real error with its statusCode/description.

    return breaker;
}

/**
 * Get the current state of a circuit breaker as a string.
 */
export function getBreakerState(breaker: CircuitBreaker): "CLOSED" | "OPEN" | "HALF_OPEN" {
    if (breaker.opened) return "OPEN";
    if (breaker.halfOpen) return "HALF_OPEN";
    return "CLOSED";
}
