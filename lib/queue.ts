import { Client } from "@upstash/qstash";

/**
 * ── High-Scale Queue Wrapper (Prompt 2.1) ──
 * Async processing infrastructure.
 */
const qstashToken = process.env.QSTASH_TOKEN;
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const qstashClient = qstashToken 
  ? new Client({ token: qstashToken })
  : null;

export type QueueType = "billing" | "defaulter" | "notification";

function getEndpointForType(type: QueueType): string {
    switch (type) {
        case "billing": return "/api/workers/process-billing";
        case "defaulter": return "/api/workers/process-defaulter";
        case "notification": return "/api/workers/process-notification";
        default: return "/api/workers/process-unknown";
    }
}

export async function enqueueJob(type: QueueType, payload: any) {
    const endpoint = getEndpointForType(type);
    
    if (!qstashClient) {
        console.warn(`[Queue] QStash not configured. Queue fallback triggered for ${type}`);
        return { success: false, fallback: true };
    }

    try {
        await qstashClient.publishJSON({
            url: `${appUrl}${endpoint}`,
            body: payload,
            retries: 5, // QStash native exponential backoff activates automatically
        });

        return { success: true, fallback: false };
    } catch (e) {
        console.error(`[Queue] Failed to enqueue job for ${type}. Queue fallback triggered`);
        return { success: false, fallback: true };
    }
}

/**
 * ── 4.3 Dead Letter Queue (DLQ) Hook ──
 * Called by worker endpoints when they catch fatal errors or exhaust retries.
 */
export async function recordFailedJob(type: QueueType, payload: any, errorMsg: string, retryCount: number = 0) {
    try {
        const { FailedJob } = await import("@/models/FailedJob");
        await FailedJob.create({
            jobType: type,
            payload,
            error: String(errorMsg).slice(0, 1000), // Trim safety
            retryCount
        });
        console.warn(`[DLQ] Captured dead-letter job for ${type}`);
    } catch (dbErr) {
        console.error("[DLQ] Critical failure attempting to save DLQ record:", dbErr);
    }
}

/**
 * Enqueue multiple jobs sequentially for safe fallback management.
 */
export async function enqueueBatch(type: QueueType, payloads: any[]) {
    if (!qstashClient) {
        console.log("Queue fallback triggered");
        return { success: false, fallback: true };
    }

    try {
        const results = await Promise.all(payloads.map(payload => enqueueJob(type, payload)));
        const anyFallback = results.some(r => r.fallback);
        if (anyFallback) {
            console.log("Queue fallback triggered");
        }
        return { success: true, fallback: anyFallback };
    } catch (e) {
        console.error(`[Queue] Batch enqueue failed for ${type}. Queue fallback triggered`);
        return { success: false, fallback: true };
    }
}
