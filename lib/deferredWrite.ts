/**
 * Fire-and-forget for non-critical DB writes so the HTTP response is not blocked.
 * Log failures; do not use when the client depends on the write succeeding.
 */
export function fireAndForget(promise: Promise<unknown>, label = "deferredWrite"): void {
    void promise.catch((err) => console.error(`[${label}]`, err));
}
