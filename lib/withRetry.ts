import { logger } from "./logger";

/**
 * withRetry — Generic exponential backoff retry wrapper
 * ─────────────────────────────────────────────────────────────────────────────
 * Retries only transient failures. Permanent failures (e.g. auth errors,
 * validation errors) are NOT retried — they are rethrown immediately.
 *
 * Features:
 * - Exponential backoff with full jitter (avoids thundering herd)
 * - Configurable max retries and base delay
 * - isTransient predicate lets callers decide what qualifies as retryable
 * - Structured Pino logging on each attempt and final failure
 *
 * Usage:
 *   const result = await withRetry(() => uploadToS3(buffer, key), {
 *     maxRetries: 3,
 *     baseDelayMs: 500,
 *     label: "S3 Upload",
 *   });
 */

export interface RetryOptions {
    /** Maximum number of retry attempts (default: 3) */
    maxRetries?: number;
    /** Base delay in milliseconds for the first retry (default: 500ms) */
    baseDelayMs?: number;
    /** Human-readable label for structured logs */
    label?: string;
    /**
     * Predicate that determines whether an error is transient (retryable).
     * Default: all errors are retried.
     */
    isTransient?: (err: unknown) => boolean;
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function jitteredBackoff(attempt: number, baseDelayMs: number): number {
    // Full jitter: random between 0 and cap
    const cap = baseDelayMs * Math.pow(2, attempt);
    return Math.random() * Math.min(cap, 30_000); // max 30 seconds
}

export async function withRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const {
        maxRetries = 3,
        baseDelayMs = 500,
        label = "operation",
        isTransient = () => true,
    } = options;

    let lastError: unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const result = await fn();
            if (attempt > 0) {
                logger.info(`[withRetry] ${label} succeeded on attempt ${attempt + 1}`);
            }
            return result;
        } catch (err) {
            lastError = err;

            if (!isTransient(err)) {
                // Permanent failure — do not retry
                logger.error(`[withRetry] ${label} failed with permanent error`, {
                    error: String(err),
                    attempt: attempt + 1,
                });
                throw err;
            }

            if (attempt === maxRetries) {
                // Exhausted all retries
                logger.error(`[withRetry] ${label} failed after ${maxRetries + 1} attempts (dead-letter)`, {
                    error: String(err),
                    attempt: attempt + 1,
                    maxRetries,
                });
                break;
            }

            const delay = jitteredBackoff(attempt, baseDelayMs);
            logger.warn(`[withRetry] ${label} failed on attempt ${attempt + 1}/${maxRetries + 1}. Retrying in ${Math.round(delay)}ms`, {
                error: String(err),
            });
            await sleep(delay);
        }
    }

    throw lastError;
}

/**
 * Default isTransient predicate for AWS S3 errors.
 * Retries network timeouts and 5xx errors; skips 4xx (permanent).
 */
export function isS3TransientError(err: unknown): boolean {
    if (!err || typeof err !== "object") return true;
    const e = err as any;
    // S3 SDK error codes for permanent failures
    const permanentCodes = new Set([
        "NoSuchBucket",
        "AccessDenied",
        "InvalidAccessKeyId",
        "SignatureDoesNotMatch",
        "NoSuchKey",
    ]);
    if (e.$metadata?.httpStatusCode) {
        const status = e.$metadata.httpStatusCode as number;
        if (status >= 400 && status < 500) return false; // 4xx = permanent
    }
    if (e.Code && permanentCodes.has(e.Code)) return false;
    return true; // everything else is transient
}
