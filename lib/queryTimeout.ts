/**
 * Timeout protection for database-heavy operations.
 * Prevents request pileups and cascading failures under load.
 *
 * Usage:
 *   const data = await withQueryTimeout(Member.aggregate(pipeline), 8000);
 */

const DEFAULT_QUERY_TIMEOUT_MS = 8000; // 8 seconds

export function withQueryTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number = DEFAULT_QUERY_TIMEOUT_MS
): Promise<T> {
    let timeoutHandle: NodeJS.Timeout;

    const timeoutPromise = new Promise<T>((_, reject) => {
        timeoutHandle = setTimeout(
            () => reject(new Error(`Query timeout after ${timeoutMs}ms`)),
            timeoutMs
        );
    });

    return Promise.race([
        promise.finally(() => clearTimeout(timeoutHandle)),
        timeoutPromise,
    ]);
}
