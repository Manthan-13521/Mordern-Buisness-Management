/**
 * ═══════════════════════════════════════════════════════════════════
 *  k6 Load Test — AquaSync 500-User Concurrency Target
 *  Target: https://modern-businesses-management.vercel.app
 *
 *  Pre-requisites:
 *    1. Set LOAD_TEST=true in Vercel Environment Variables
 *    2. Ensure MongoDB is M10+ tier (1500 max connections)
 *    3. Ensure Upstash Redis is working (latency < 150ms)
 *    4. Install k6: brew install k6
 *
 *  Usage:
 *    # Full 500 VU test (3 min)
 *    k6 run scripts/load-test.js
 *
 *    # Progressive testing (RECOMMENDED):
 *    k6 run scripts/load-test.js --env SCENARIO=smoke      # 5 VUs
 *    k6 run scripts/load-test.js --env SCENARIO=load        # 50 VUs
 *    k6 run scripts/load-test.js --env SCENARIO=stress      # 200 VUs
 *    k6 run scripts/load-test.js --env SCENARIO=peak        # 500 VUs
 *
 *    # Custom overrides
 *    k6 run --vus 100 --duration 2m scripts/load-test.js
 *    BASE_URL=http://localhost:3000 k6 run scripts/load-test.js
 *
 *  How it works:
 *    All requests include ?test=true query param.
 *    When LOAD_TEST=true on the server:
 *      - middleware skips auth/subscription/tenant guards
 *      - rate limiting and abuse detection are bypassed
 *      - resolveUser() returns a synthetic admin user (BIZ001)
 *    When LOAD_TEST is not "true" (production default):
 *      - ?test=true is ignored, normal auth is enforced
 * ═══════════════════════════════════════════════════════════════════
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// ── Custom Metrics ───────────────────────────────────────────────
const errorRate = new Rate('errors');
const authErrors = new Counter('auth_errors');
const tenantErrors = new Counter('tenant_errors');
const rateLimitErrors = new Counter('rate_limit_errors');
const cacheHits = new Counter('cache_hits');
const cacheMisses = new Counter('cache_misses');

// Per-endpoint P95 tracking
const appInitDuration = new Trend('app_init_duration', true);
const dashboardDuration = new Trend('dashboard_duration', true);
const membersDuration = new Trend('members_duration', true);
const paymentsDuration = new Trend('payments_duration', true);

// ── Configuration ────────────────────────────────────────────────
const BASE_URL = __ENV.BASE_URL || 'https://modern-businesses-management.vercel.app';
const TEST_PARAM = 'test=true';
const SCENARIO = __ENV.SCENARIO || 'peak'; // smoke | load | stress | peak

// ── Scenario Definitions ────────────────────────────────────────
const scenarios = {
  smoke: {
    smoke: {
      executor: 'constant-vus',
      vus: 5,
      duration: '30s',
      tags: { scenario: 'smoke' },
    },
  },
  load: {
    load: {
      executor: 'constant-vus',
      vus: 50,
      duration: '1m',
      tags: { scenario: 'load' },
    },
  },
  stress: {
    stress: {
      executor: 'constant-vus',
      vus: 200,
      duration: '2m',
      tags: { scenario: 'stress' },
    },
  },
  peak: {
    peak: {
      executor: 'constant-vus',
      vus: 500,
      duration: '3m',
      tags: { scenario: 'peak' },
    },
  },
};

export const options = {
  scenarios: scenarios[SCENARIO] || scenarios.peak,
  thresholds: {
    // Global
    http_req_duration: ['p(95)<800'],       // P95 < 800ms target
    http_req_failed: ['rate<0.01'],         // Error rate < 1%
    errors: ['rate<0.01'],

    // Safety — zero auth/tenant errors expected with bypass
    auth_errors: ['count<1'],
    tenant_errors: ['count<1'],
    rate_limit_errors: ['count<1'],

    // Per-endpoint P95 targets
    app_init_duration: ['p(95)<1000'],       // app-init: heaviest endpoint
    dashboard_duration: ['p(95)<800'],       // dashboard: cached
    members_duration: ['p(95)<800'],         // members: paginated
    payments_duration: ['p(95)<800'],        // payments: paginated
  },
};

// ── Helper ───────────────────────────────────────────────────────
function testGet(endpoint) {
  const separator = endpoint.includes('?') ? '&' : '?';
  const url = `${BASE_URL}${endpoint}${separator}${TEST_PARAM}`;
  return http.get(url, {
    headers: { 'Accept': 'application/json' },
    tags: { endpoint: endpoint.split('?')[0] },
    timeout: '30s',
  });
}

function classifyError(res) {
  if (res.status === 401) authErrors.add(1);
  if (res.status === 400) tenantErrors.add(1);
  if (res.status === 429) rateLimitErrors.add(1);
}

function trackCacheHeader(res) {
  const cacheHeader = res.headers['X-Cache'] || res.headers['x-cache'];
  if (cacheHeader) {
    cacheHits.add(1);
  } else {
    cacheMisses.add(1);
  }
}

// ── Traffic Distribution ─────────────────────────────────────────
// Weighted random selection:
//   40% → app-init (heaviest, but cached — simulates page load)
//   30% → dashboard (frequent polling)
//   20% → members (browsing)
//   10% → payments (least frequent)

function selectEndpoint() {
  const rand = Math.random();
  if (rand < 0.40) return 'app-init';
  if (rand < 0.70) return 'dashboard';
  if (rand < 0.90) return 'members';
  return 'payments';
}

// ── Endpoint Handlers ────────────────────────────────────────────
function hitAppInit() {
  group('App Init', () => {
    const res = testGet('/api/app-init');
    const passed = check(res, {
      'app-init status 200': (r) => r.status === 200,
      'app-init has body': (r) => r.body && r.body.length > 2,
      'app-init has dashboard': (r) => {
        try { return JSON.parse(r.body).dashboard !== undefined; }
        catch { return false; }
      },
      'app-init no auth error': (r) => {
        try { return JSON.parse(r.body).error !== 'Unauthorized'; }
        catch { return true; }
      },
    });
    errorRate.add(!passed);
    appInitDuration.add(res.timings.duration);
    trackCacheHeader(res);
    if (res.status !== 200) {
      classifyError(res);
      if (__VU <= 3) console.log(`[app-init] ${res.status}: ${res.body?.substring(0, 150)}`);
    }
  });
}

function hitDashboard() {
  group('Dashboard', () => {
    const res = testGet('/api/dashboard');
    const passed = check(res, {
      'dashboard status 200': (r) => r.status === 200,
      'dashboard has stats': (r) => {
        try { return JSON.parse(r.body).stats !== undefined; }
        catch { return false; }
      },
    });
    errorRate.add(!passed);
    dashboardDuration.add(res.timings.duration);
    trackCacheHeader(res);
    if (res.status !== 200) {
      classifyError(res);
      if (__VU <= 3) console.log(`[dashboard] ${res.status}: ${res.body?.substring(0, 150)}`);
    }
  });
}

function hitMembers() {
  group('Members', () => {
    const page = Math.floor(Math.random() * 3) + 1; // Random page 1-3
    const res = testGet(`/api/members?page=${page}&limit=20`);
    const passed = check(res, {
      'members status 200': (r) => r.status === 200,
      'members has data': (r) => {
        try { return Array.isArray(JSON.parse(r.body).data); }
        catch { return false; }
      },
    });
    errorRate.add(!passed);
    membersDuration.add(res.timings.duration);
    if (res.status !== 200) {
      classifyError(res);
      if (__VU <= 3) console.log(`[members] ${res.status}: ${res.body?.substring(0, 150)}`);
    }
  });
}

function hitPayments() {
  group('Payments', () => {
    const res = testGet('/api/payments?page=1&limit=10');
    const passed = check(res, {
      'payments status 200': (r) => r.status === 200,
    });
    errorRate.add(!passed);
    paymentsDuration.add(res.timings.duration);
    if (res.status !== 200) {
      classifyError(res);
      if (__VU <= 3) console.log(`[payments] ${res.status}: ${res.body?.substring(0, 150)}`);
    }
  });
}

// ── Main Test Function ───────────────────────────────────────────
export default function () {
  // Weighted random endpoint selection
  const endpoint = selectEndpoint();

  switch (endpoint) {
    case 'app-init':
      hitAppInit();
      break;
    case 'dashboard':
      hitDashboard();
      break;
    case 'members':
      hitMembers();
      break;
    case 'payments':
      hitPayments();
      break;
  }

  // Realistic think time between requests (100-500ms)
  sleep(0.1 + Math.random() * 0.4);
}

// ── Summary Handler ──────────────────────────────────────────────
export function handleSummary(data) {
  const p95 = data.metrics?.http_req_duration?.values?.['p(95)'] || 'N/A';
  const p99 = data.metrics?.http_req_duration?.values?.['p(99)'] || 'N/A';
  const errRate = data.metrics?.http_req_failed?.values?.rate || 0;
  const totalReqs = data.metrics?.http_reqs?.values?.count || 0;

  const appP95 = data.metrics?.app_init_duration?.values?.['p(95)'] || 'N/A';
  const dashP95 = data.metrics?.dashboard_duration?.values?.['p(95)'] || 'N/A';
  const memP95 = data.metrics?.members_duration?.values?.['p(95)'] || 'N/A';
  const payP95 = data.metrics?.payments_duration?.values?.['p(95)'] || 'N/A';

  const summary = `
╔══════════════════════════════════════════════════════════════╗
║          AquaSync Load Test Results Summary                  ║
╠══════════════════════════════════════════════════════════════╣
║  Total Requests:    ${String(totalReqs).padEnd(40)}║
║  Error Rate:        ${String((errRate * 100).toFixed(2) + '%').padEnd(40)}║
║  P95 Latency:       ${String(typeof p95 === 'number' ? p95.toFixed(0) + 'ms' : p95).padEnd(40)}║
║  P99 Latency:       ${String(typeof p99 === 'number' ? p99.toFixed(0) + 'ms' : p99).padEnd(40)}║
╠══════════════════════════════════════════════════════════════╣
║  Per-Endpoint P95:                                           ║
║    app-init:        ${String(typeof appP95 === 'number' ? appP95.toFixed(0) + 'ms' : appP95).padEnd(40)}║
║    dashboard:       ${String(typeof dashP95 === 'number' ? dashP95.toFixed(0) + 'ms' : dashP95).padEnd(40)}║
║    members:         ${String(typeof memP95 === 'number' ? memP95.toFixed(0) + 'ms' : memP95).padEnd(40)}║
║    payments:        ${String(typeof payP95 === 'number' ? payP95.toFixed(0) + 'ms' : payP95).padEnd(40)}║
╠══════════════════════════════════════════════════════════════╣
║  Targets:                                                    ║
║    P95 < 800ms:     ${String(typeof p95 === 'number' && p95 < 800 ? '✅ PASS' : '❌ FAIL').padEnd(40)}║
║    Errors < 1%:     ${String(errRate < 0.01 ? '✅ PASS' : '❌ FAIL').padEnd(40)}║
╚══════════════════════════════════════════════════════════════╝
`;

  console.log(summary);

  return {
    stdout: summary,
  };
}