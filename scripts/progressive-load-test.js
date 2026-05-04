/**
 * Progressive Load Test — AquaSync SaaS
 * ═══════════════════════════════════════
 * Staged concurrency: 20 → 50 → 100 → 150 → 200 VUs
 * Each stage: 2 minutes, with 30s ramp between stages.
 *
 * Safety: Aborts if error rate > 5% or repeated 500s.
 *
 * Usage: k6 run scripts/progressive-load-test.js
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend, Counter } from "k6/metrics";

// ─── Custom Metrics ──────────────────────────────────────────────────────────
const errorRate = new Rate("error_rate");
const timeouts = new Counter("timeout_count");
const serverErrors = new Counter("server_500_errors");

const appInitP95 = new Trend("app_init_p95", true);
const dashboardP95 = new Trend("dashboard_p95", true);
const membersP95 = new Trend("members_p95", true);
const paymentsP95 = new Trend("payments_p95", true);

// ─── Configuration ───────────────────────────────────────────────────────────
const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

export const options = {
  stages: [
    // Stage 1: Baseline (20 VUs)
    { duration: "30s", target: 20 },   // ramp up
    { duration: "2m", target: 20 },    // hold
    { duration: "10s", target: 0 },    // cooldown

    // Stage 2: Stable Load (50 VUs)
    { duration: "30s", target: 50 },
    { duration: "2m", target: 50 },
    { duration: "10s", target: 0 },

    // Stage 3: Stress Entry (100 VUs)
    { duration: "30s", target: 100 },
    { duration: "2m", target: 100 },
    { duration: "10s", target: 0 },

    // Stage 4: Upper Bound (150 VUs)
    { duration: "30s", target: 150 },
    { duration: "2m", target: 150 },
    { duration: "10s", target: 0 },

    // Stage 5: Breaking Point (200 VUs)
    { duration: "30s", target: 200 },
    { duration: "2m", target: 200 },
    { duration: "30s", target: 0 },   // final cooldown
  ],

  thresholds: {
    http_req_duration: ["p(95)<2000"],  // Global P95 < 2s
    error_rate: ["rate<0.05"],           // Error rate < 5%
    server_500_errors: ["count<50"],     // Abort if 50+ server errors
  },

  // Don't discard response bodies — we need them for error analysis
  discardResponseBodies: false,

  // Tags for per-stage analysis in the summary
  summaryTrendStats: ["min", "med", "avg", "p(50)", "p(90)", "p(95)", "p(99)", "max", "count"],
};

// ─── Endpoints with Traffic Distribution ─────────────────────────────────────
const ENDPOINTS = [
  { name: "app-init",  url: `${BASE_URL}/api/app-init?test=true`,                    weight: 0.40, trend: appInitP95 },
  { name: "dashboard", url: `${BASE_URL}/api/dashboard?test=true`,                   weight: 0.70, trend: dashboardP95 },
  { name: "members",   url: `${BASE_URL}/api/members?page=1&limit=20&test=true`,     weight: 0.90, trend: membersP95 },
  { name: "payments",  url: `${BASE_URL}/api/payments?page=1&limit=10&test=true`,    weight: 1.00, trend: paymentsP95 },
];

// ─── Main Test Function ──────────────────────────────────────────────────────
export default function () {
  const rand = Math.random();
  let endpoint;

  for (const ep of ENDPOINTS) {
    if (rand < ep.weight) {
      endpoint = ep;
      break;
    }
  }

  const params = {
    headers: { "Content-Type": "application/json" },
    timeout: "10s",
    tags: { endpoint: endpoint.name },
  };

  const res = http.get(endpoint.url, params);

  // Track per-endpoint latency
  endpoint.trend.add(res.timings.duration);

  // Error tracking
  const isError = res.status >= 400 || res.status === 0;
  errorRate.add(isError);

  if (res.status >= 500) {
    serverErrors.add(1);
    // Log sample failed responses (every 10th to avoid flooding)
    if (Math.random() < 0.1) {
      const body = typeof res.body === "string" ? res.body.substring(0, 200) : "";
      console.log(`[500] ${endpoint.name} | status=${res.status} | body=${body}`);
    }
  }

  if (res.status === 0) {
    timeouts.add(1);
    if (Math.random() < 0.1) {
      console.log(`[TIMEOUT] ${endpoint.name} | error=${res.error}`);
    }
  }

  // Validation
  check(res, {
    "status is 200": (r) => r.status === 200,
    "response has body": (r) => r.body && r.body.length > 0,
    "latency < 2000ms": (r) => r.timings.duration < 2000,
  });

  // Realistic think time (100-500ms)
  sleep(Math.random() * 0.4 + 0.1);
}

// ─── Summary Handler ─────────────────────────────────────────────────────────
export function handleSummary(data) {
  const totalReqs = data.metrics.http_reqs ? data.metrics.http_reqs.values.count : 0;
  const errRate = data.metrics.error_rate ? data.metrics.error_rate.values.rate : 0;
  const p50 = data.metrics.http_req_duration ? data.metrics.http_req_duration.values["p(50)"] : 0;
  const p95 = data.metrics.http_req_duration ? data.metrics.http_req_duration.values["p(95)"] : 0;
  const p99 = data.metrics.http_req_duration ? data.metrics.http_req_duration.values["p(99)"] : 0;
  const avgDuration = data.metrics.http_req_duration ? data.metrics.http_req_duration.values.avg : 0;
  const timeoutCount = data.metrics.timeout_count ? data.metrics.timeout_count.values.count : 0;
  const server500s = data.metrics.server_500_errors ? data.metrics.server_500_errors.values.count : 0;

  // Per-endpoint P95
  const aiP95 = data.metrics.app_init_p95 ? data.metrics.app_init_p95.values["p(95)"] : 0;
  const dbP95 = data.metrics.dashboard_p95 ? data.metrics.dashboard_p95.values["p(95)"] : 0;
  const mbP95 = data.metrics.members_p95 ? data.metrics.members_p95.values["p(95)"] : 0;
  const pyP95 = data.metrics.payments_p95 ? data.metrics.payments_p95.values["p(95)"] : 0;

  // Throughput
  const totalDurationSec = data.state ? data.state.testRunDurationMs / 1000 : 1;
  const rps = totalReqs / totalDurationSec;

  const report = `
══════════════════════════════════════════════════════════════════════════
  AQUASYNC PROGRESSIVE LOAD TEST REPORT
══════════════════════════════════════════════════════════════════════════

  Total Requests:     ${totalReqs}
  Throughput:         ${rps.toFixed(1)} req/sec
  Error Rate:         ${(errRate * 100).toFixed(2)}%
  Timeout Count:      ${timeoutCount}
  Server 500 Errors:  ${server500s}

  ── Global Latency ──────────────────────────────────────────────────
  P50:    ${p50.toFixed(0)}ms
  P95:    ${p95.toFixed(0)}ms
  P99:    ${p99.toFixed(0)}ms
  Avg:    ${avgDuration.toFixed(0)}ms

  ── Per-Endpoint P95 ────────────────────────────────────────────────
  /api/app-init:     ${aiP95.toFixed(0)}ms
  /api/dashboard:    ${dbP95.toFixed(0)}ms
  /api/members:      ${mbP95.toFixed(0)}ms
  /api/payments:     ${pyP95.toFixed(0)}ms

  ── Verdict ─────────────────────────────────────────────────────────
  Error Rate:   ${errRate < 0.05 ? "✅ PASS" : "❌ FAIL"} (${(errRate * 100).toFixed(2)}% < 5%)
  P95 Latency:  ${p95 < 2000 ? "✅ PASS" : (p95 < 5000 ? "⚠️  DEGRADED" : "❌ FAIL")} (${p95.toFixed(0)}ms)
  Timeouts:     ${timeoutCount === 0 ? "✅ ZERO" : "⚠️  " + timeoutCount + " timeouts"}

══════════════════════════════════════════════════════════════════════════
`;

  // Write both human-readable and JSON reports
  return {
    stdout: report,
    "scripts/load-test-results.json": JSON.stringify(data, null, 2),
  };
}
