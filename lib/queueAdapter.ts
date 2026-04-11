import { jobSchemas, type JobType } from "@/lib/schemas/jobSchemas";
import { sendReminders, sendWelcome } from "@/lib/services/notificationService";
import { handleMemberExpiry } from "@/lib/services/memberService";
import { handlePaymentRetry } from "@/lib/services/paymentService";
import { logger } from "@/lib/logger";
import { redis } from "@/lib/redis";

/**
 * Queue Adapter — Central dispatcher for all background jobs.
 *
 * Architecture:
 *   Route → dispatchJob() → Service Layer → Actual logic
 *
 * Currently executes jobs directly (synchronous).
 * FUTURE: Replace direct calls with `queue.add(type, data)` for BullMQ.
 *
 * Features:
 *   ✅ Zod validation inside dispatcher (never trust input)
 *   ✅ Structured logging (start, success, failure with severity)
 *   ✅ Idempotency key generation (for future dedup enforcement)
 *   ✅ Timeout protection (prevents hanging service calls)
 *   ✅ Try-catch with error logging + severity tags
 */

// ── Timeout per job type (ms) ────────────────────────────────────────────
const JOB_TIMEOUTS: Record<JobType, number> = {
    SEND_REMINDER: 30_000,        // reminders may process many members
    SEND_WELCOME_WHATSAPP: 10_000,
    EXPIRE_MEMBERS: 60_000,       // heavy DB operations
    PAYMENT_RETRY: 15_000,
};

// ── Severity classification ──────────────────────────────────────────────
const CRITICAL_JOBS: Set<JobType> = new Set(["EXPIRE_MEMBERS", "PAYMENT_RETRY"]);

// ── Idempotency key generator ────────────────────────────────────────────
// FUTURE: Store keys in Redis/DB to enforce dedup. Currently generates only.
function generateJobKey(type: JobType, data: any): string {
    const identifier = data.memberId ?? data.userId ?? data.poolId ?? "global";
    const timestamp = Math.floor(Date.now() / 60_000); // 1-minute window
    return `${type}:${identifier}:${timestamp}`;
}

// ── Timeout wrapper ──────────────────────────────────────────────────────
function withTimeout<T>(promise: Promise<T>, ms: number, jobType: string): Promise<T> {
    return Promise.race([
        promise,
        new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Job ${jobType} timed out after ${ms}ms`)), ms)
        ),
    ]);
}

// ── Main dispatcher ──────────────────────────────────────────────────────

export async function dispatchJob(type: JobType, data: unknown): Promise<unknown> {
    // ── 1. Validate payload ──────────────────────────────────────────────
    const schema = jobSchemas[type];
    if (!schema) {
        logger.error("[QueueAdapter] Unknown job type", { type });
        throw new Error(`Unknown job type: ${type}`);
    }

    const validated = schema.parse(data);

    // ── 2. Generate idempotency key ──────────────────────────────────────
    const jobKey = generateJobKey(type, validated);
    if (redis) {
        try {
            const isDuplicate = await redis.setnx(`idempotency:${jobKey}`, "1");
            if (isDuplicate === 0) {
                logger.info("[QueueAdapter] JOB_SKIPPED_DUPLICATE", { jobType: type, jobKey });
                return { success: true, message: "Duplicate skipped by idempotency check" };
            }
            await redis.expire(`idempotency:${jobKey}`, 86400); // 24hr lockout
        } catch (e) {
            console.warn("Idempotency backend failure:", e);
        }
    }

    // ── 3. Log dispatch ──────────────────────────────────────────────────
    logger.info("[QueueAdapter] JOB_DISPATCHED", {
        jobType: type,
        jobKey,
        status: "DISPATCHED",
    });

    // ── 4. Execute with timeout + error handling ─────────────────────────
    const timeout = JOB_TIMEOUTS[type] ?? 15_000;

    try {
        let result: unknown;

        switch (type) {
            case "SEND_REMINDER":
                result = await withTimeout(sendReminders(validated), timeout, type);
                break;

            case "SEND_WELCOME_WHATSAPP":
                result = await withTimeout(sendWelcome(validated), timeout, type);
                break;

            case "EXPIRE_MEMBERS":
                result = await withTimeout(handleMemberExpiry(), timeout, type);
                break;

            case "PAYMENT_RETRY":
                result = await withTimeout(handlePaymentRetry(validated), timeout, type);
                break;

            default:
                throw new Error(`Unhandled job type: ${type}`);
        }

        logger.info("[QueueAdapter] JOB_COMPLETED", {
            jobType: type,
            jobKey,
            status: "SUCCESS",
        });

        return result;

    } catch (err: any) {
        const severity = CRITICAL_JOBS.has(type) ? "CRITICAL" : "WARNING";
        const isTimeout = err?.message?.includes("timed out");

        logger.error(`[QueueAdapter] JOB_FAILED_${severity}`, {
            jobType: type,
            jobKey,
            severity,
            isTimeout,
            error: err?.message || String(err),
        });

        throw err;
    }
}
