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
    help: "Duration of HTTP requests in microseconds",
    labelNames: ["method", "route", "code"],
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
});
register.registerMetric(httpRequestDurationMicroseconds);

export const dbQueryDurationMicroseconds = new client.Histogram({
    name: "db_query_duration_seconds",
    help: "Duration of Database queries in microseconds",
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

export { register };
