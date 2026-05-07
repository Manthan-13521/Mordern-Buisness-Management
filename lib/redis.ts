import { Redis } from "@upstash/redis";

/**
 * Upstash Redis client.
 * Falls back gracefully if env vars are missing (dev mode).
 */
let redis: Redis | null = null;

try {
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
        redis = new Redis({
            url: process.env.UPSTASH_REDIS_REST_URL,
            token: process.env.UPSTASH_REDIS_REST_TOKEN,
        });

        // ── Prompt 3.1: Health Check ──
        redis?.ping().catch(() => {
            console.error("[ERROR] redis down");
        });
    }
} catch (err) {
    console.error("[ERROR] redis down", err);
}

export { redis };

/**
 * Executes a promise with a hard timeout (default 150ms).
 * Prevents Redis latencies from stalling the main thread.
 */
export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 150): Promise<T> {
    let timeoutHandle: NodeJS.Timeout;
    const timeoutPromise = new Promise<T>((_, reject) => {
        timeoutHandle = setTimeout(() => reject(new Error("Redis timeout")), timeoutMs);
    });

    return Promise.race([
        promise.finally(() => clearTimeout(timeoutHandle)),
        timeoutPromise
    ]);
}
