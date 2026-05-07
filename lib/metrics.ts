import client from "prom-client";

// Create a Registry which registers the metrics
const register = new client.Registry();

// Add a default label which is added to all metrics
register.setDefaultLabels({
    app: "aquasync-saas",
});

// Enable the collection of default metrics
client.collectDefaultMetrics({ register });

// ── Custom Application Metrics ──────────────────────────────────────────────

export const httpRequestDurationMicroseconds = new client.Histogram({
    name: "http_request_duration_seconds",
    help: "Duration of HTTP requests in seconds",
    labelNames: ["method", "route", "code"],
    // Tightened buckets targeting <300ms API latency
    buckets: [0.05, 0.1, 0.2, 0.3, 0.5, 1, 2, 5],
});
register.registerMetric(httpRequestDurationMicroseconds);

export const dbQueryDurationMicroseconds = new client.Histogram({
    name: "db_query_duration_seconds",
    help: "Duration of Database queries in seconds",
    labelNames: ["model", "operation"],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});
register.registerMetric(dbQueryDurationMicroseconds);

export const queueFailuresCounter = new client.Counter({
    name: "queue_failures_total",
    help: "Total number of background queue failures",
    labelNames: ["queue_name", "error_type"],
});
register.registerMetric(queueFailuresCounter);

export const paymentFailuresCounter = new client.Counter({
    name: "payment_failures_total",
    help: "Total number of failed payment attempts",
    labelNames: ["method"],
});
register.registerMetric(paymentFailuresCounter);

export const loginFailuresCounter = new client.Counter({
    name: "login_failures_total",
    help: "Total number of failed login attempts",
});
register.registerMetric(loginFailuresCounter);

// ── Cache Performance Metrics ──────────────────────────────────────────────
export const cacheHitCounter = new client.Counter({
    name: "cache_operations_total",
    help: "Total cache hit/miss operations",
    labelNames: ["layer", "result"], // layer: redis|memory, result: hit|miss
});
register.registerMetric(cacheHitCounter);

// ── API Error Rate ─────────────────────────────────────────────────────────
export const apiErrorCounter = new client.Counter({
    name: "api_errors_total",
    help: "Total API errors by route and type",
    labelNames: ["route", "error_type"],
});
register.registerMetric(apiErrorCounter);

// ── Circuit Breaker State ──────────────────────────────────────────────────
export const circuitBreakerState = new client.Gauge({
    name: "circuit_breaker_state",
    help: "Current circuit breaker state (0=closed, 1=open, 2=half-open)",
    labelNames: ["service"],
});
register.registerMetric(circuitBreakerState);

export { register };
