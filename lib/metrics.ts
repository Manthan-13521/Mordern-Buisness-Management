/**
 * Corrective Fix #3: Dual metrics layer — prom-client + Sentry.
 *
 * prom-client is restored for backward-compatible /api/metrics Prometheus scraping.
 * Sentry metrics are kept for serverless-native monitoring (counters survive cold starts).
 *
 * Every .inc() / .observe() / .set() call writes to BOTH layers.
 *
 * NOTE: prom-client counters still reset on Vercel cold starts.
 * Prometheus scrapers must handle counter resets via rate() / increase() functions.
 * Sentry metrics do NOT reset and are the source of truth for dashboards.
 */

import client from "prom-client";

// ── prom-client Registry ────────────────────────────────────────────────────
const register = new client.Registry();
register.setDefaultLabels({ app: "aquasync-saas" });
client.collectDefaultMetrics({ register });

// ── Sentry (optional — non-fatal if unavailable) ────────────────────────────
let Sentry: any = null;
try {
    Sentry = require("@sentry/nextjs");
} catch {
    // Sentry not available — Sentry metrics will be no-ops
}

// ── Dual Counter ────────────────────────────────────────────────────────────
class DualCounter {
    private promCounter: client.Counter;
    private metricName: string;
    constructor(name: string, help: string, labelNames: string[] = []) {
        this.metricName = name;
        this.promCounter = new client.Counter({ name, help, labelNames });
        register.registerMetric(this.promCounter);
    }
    inc(labels?: Record<string, string>, value = 1) {
        try { this.promCounter.inc(labels || {}, value); } catch { /* non-critical */ }
        if (Sentry?.metrics) {
            try { Sentry.metrics.increment(this.metricName, value, { tags: labels }); } catch { /* non-critical */ }
        }
    }
}

// ── Dual Histogram ──────────────────────────────────────────────────────────
class DualHistogram {
    private promHistogram: client.Histogram;
    private metricName: string;
    constructor(name: string, help: string, labelNames: string[] = [], buckets?: number[]) {
        this.metricName = name;
        this.promHistogram = new client.Histogram({ name, help, labelNames, buckets });
        register.registerMetric(this.promHistogram);
    }
    observe(labels: Record<string, string>, value: number) {
        try { this.promHistogram.observe(labels, value); } catch { /* non-critical */ }
        if (Sentry?.metrics) {
            try { Sentry.metrics.distribution(this.metricName, value, { tags: labels, unit: "second" }); } catch { /* non-critical */ }
        }
    }
}

// ── Dual Gauge ──────────────────────────────────────────────────────────────
class DualGauge {
    private promGauge: client.Gauge;
    private metricName: string;
    constructor(name: string, help: string, labelNames: string[] = []) {
        this.metricName = name;
        this.promGauge = new client.Gauge({ name, help, labelNames });
        register.registerMetric(this.promGauge);
    }
    set(labels: Record<string, string>, value: number) {
        try { this.promGauge.set(labels, value); } catch { /* non-critical */ }
        if (Sentry?.metrics) {
            try { Sentry.metrics.gauge(this.metricName, value, { tags: labels }); } catch { /* non-critical */ }
        }
    }
}

// ── Custom Application Metrics ──────────────────────────────────────────────

export const httpRequestDurationMicroseconds = new DualHistogram(
    "http_request_duration_seconds",
    "Duration of HTTP requests in seconds",
    ["method", "route", "code"],
    [0.05, 0.1, 0.2, 0.3, 0.5, 1, 2, 5]
);

export const dbQueryDurationMicroseconds = new DualHistogram(
    "db_query_duration_seconds",
    "Duration of Database queries in seconds",
    ["model", "operation"],
    [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
);

export const queueFailuresCounter = new DualCounter(
    "queue_failures_total",
    "Total number of background queue failures",
    ["queue_name", "error_type"]
);

export const paymentFailuresCounter = new DualCounter(
    "payment_failures_total",
    "Total number of failed payment attempts",
    ["method"]
);

export const loginFailuresCounter = new DualCounter(
    "login_failures_total",
    "Total number of failed login attempts"
);

// ── Cache Performance Metrics ──────────────────────────────────────────────
export const cacheHitCounter = new DualCounter(
    "cache_operations_total",
    "Total cache hit/miss operations",
    ["layer", "result"]
);

// ── API Error Rate ─────────────────────────────────────────────────────────
export const apiErrorCounter = new DualCounter(
    "api_errors_total",
    "Total API errors by route and type",
    ["route", "error_type"]
);

// ── Circuit Breaker State ──────────────────────────────────────────────────
export const circuitBreakerState = new DualGauge(
    "circuit_breaker_state",
    "Current circuit breaker state (0=closed, 1=open, 2=half-open)",
    ["service"]
);

export { register };
