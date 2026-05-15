/**
 * lib/queryTimer.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Lightweight query duration tracker for identifying slow hostel routes.
 *
 * USAGE:
 *   import { timedQuery } from "@/lib/queryTimer";
 *   const result = await timedQuery(
 *       "monthly-income",
 *       hostelId,
 *       () => HostelPayment.aggregate([...])
 *   );
 *
 * Logs a warning if the query exceeds the threshold (default 2000ms).
 * NEVER logs PII — only route, tenant ID, and duration.
 * ─────────────────────────────────────────────────────────────────────────
 */

import { logger } from "@/lib/logger";

const DEFAULT_SLOW_THRESHOLD_MS = 2000;

/**
 * Execute a database operation and log if it exceeds the slow threshold.
 *
 * @param routeLabel  Human-readable label for the route (e.g. "monthly-income")
 * @param tenantId    Hostel/Pool/Business ID (for scoped logging)
 * @param fn          Async function to execute and time
 * @param thresholdMs Optional custom slow threshold (default 2000ms)
 * @returns The result of fn()
 */
export async function timedQuery<T>(
    routeLabel: string,
    tenantId: string,
    fn: () => Promise<T>,
    thresholdMs: number = DEFAULT_SLOW_THRESHOLD_MS
): Promise<T> {
    const start = Date.now();

    try {
        const result = await fn();
        const duration = Date.now() - start;

        if (duration > thresholdMs) {
            logger.warn(`SLOW_QUERY: ${routeLabel} took ${duration}ms`, {
                route: routeLabel,
                tenantId,
                durationMs: duration,
                threshold: thresholdMs,
            });
        }

        return result;
    } catch (error) {
        const duration = Date.now() - start;
        logger.error(`QUERY_FAILED: ${routeLabel} after ${duration}ms`, {
            route: routeLabel,
            tenantId,
            durationMs: duration,
        });
        throw error;
    }
}
