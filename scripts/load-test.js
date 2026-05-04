/**
 * ═══════════════════════════════════════════════════════════════════
 *  k6 Load Test — Auth Bypass Mode
 *  Target: https://modern-businesses-management.vercel.app
 *
 *  Pre-requisites:
 *    1. Set LOAD_TEST=true in Vercel Environment Variables
 *    2. Install k6: brew install k6
 *
 *  Usage:
 *    k6 run scripts/load-test.js
 *    k6 run --vus 50 --duration 30s scripts/load-test.js
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
const appInitDuration = new Trend('app_init_duration', true);
const dashboardDuration = new Trend('dashboard_duration', true);
const membersDuration = new Trend('members_duration', true);
const paymentsDuration = new Trend('payments_duration', true);

// ── Configuration ────────────────────────────────────────────────
const BASE_URL = __ENV.BASE_URL || 'https://modern-businesses-management.vercel.app';
const TEST_PARAM = 'test=true';

export const options = {
  scenarios: {
    // Smoke test: verify bypass works (1 VU, 5s)
    smoke: {
      executor: 'constant-vus',
      vus: 1,
      duration: '5s',
      startTime: '0s',
      tags: { scenario: 'smoke' },
    },
    // Load test: sustained traffic (10 VUs, 20s)
    load: {
      executor: 'constant-vus',
      vus: 10,
      duration: '20s',
      startTime: '6s',
      tags: { scenario: 'load' },
    },
    // Spike test: burst traffic (30 VUs, 10s)
    spike: {
      executor: 'constant-vus',
      vus: 30,
      duration: '10s',
      startTime: '27s',
      tags: { scenario: 'spike' },
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<5000'],
    errors: ['rate<0.05'],
    auth_errors: ['count<1'],
    tenant_errors: ['count<1'],
    rate_limit_errors: ['count<1'],
    app_init_duration: ['p(95)<4000'],
    dashboard_duration: ['p(95)<4000'],
  },
};

// ── Helper ───────────────────────────────────────────────────────
function testGet(endpoint) {
  const separator = endpoint.includes('?') ? '&' : '?';
  const url = `${BASE_URL}${endpoint}${separator}${TEST_PARAM}`;
  return http.get(url, {
    headers: { 'Accept': 'application/json' },
    tags: { endpoint: endpoint.split('?')[0] },
  });
}

function classifyError(res) {
  if (res.status === 401) authErrors.add(1);
  if (res.status === 400) tenantErrors.add(1);
  if (res.status === 429) rateLimitErrors.add(1);
}

// ── Main Test Function ───────────────────────────────────────────
export default function () {
  // 1. App Init — consolidated bootstrap endpoint
  group('App Init', () => {
    const res = testGet('/api/app-init');
    const passed = check(res, {
      'app-init status 200': (r) => r.status === 200,
      'app-init has body': (r) => r.body && r.body.length > 2,
      'app-init no auth error': (r) => {
        try { return JSON.parse(r.body).error !== 'Unauthorized'; }
        catch { return true; }
      },
    });
    errorRate.add(!passed);
    appInitDuration.add(res.timings.duration);
    if (res.status !== 200) {
      classifyError(res);
      console.log(`[app-init] ${res.status}: ${res.body?.substring(0, 150)}`);
    }
  });

  sleep(0.3);

  // 2. Dashboard
  group('Dashboard', () => {
    const res = testGet('/api/dashboard');
    const passed = check(res, {
      'dashboard status 200': (r) => r.status === 200,
      'dashboard has stats': (r) => {
        try { return JSON.parse(r.body).stats !== undefined; }
        catch { return false; }
      },
      'dashboard no pool error': (r) => {
        try { return !JSON.parse(r.body).error?.includes('pool'); }
        catch { return true; }
      },
    });
    errorRate.add(!passed);
    dashboardDuration.add(res.timings.duration);
    if (res.status !== 200) {
      classifyError(res);
      console.log(`[dashboard] ${res.status}: ${res.body?.substring(0, 150)}`);
    }
  });

  sleep(0.3);

  // 3. Members (paginated)
  group('Members', () => {
    const res = testGet('/api/members?page=1&limit=10');
    const passed = check(res, {
      'members status 200': (r) => r.status === 200,
    });
    errorRate.add(!passed);
    membersDuration.add(res.timings.duration);
    if (res.status !== 200) {
      classifyError(res);
      console.log(`[members] ${res.status}: ${res.body?.substring(0, 150)}`);
    }
  });

  sleep(0.3);

  // 4. Payments (paginated)
  group('Payments', () => {
    const res = testGet('/api/payments?page=1&limit=10');
    const passed = check(res, {
      'payments status 200': (r) => r.status === 200,
    });
    errorRate.add(!passed);
    paymentsDuration.add(res.timings.duration);
    if (res.status !== 200) {
      classifyError(res);
      console.log(`[payments] ${res.status}: ${res.body?.substring(0, 150)}`);
    }
  });

  sleep(0.3);

  // 5. Health (always-allowed, baseline latency)
  group('Health', () => {
    const res = http.get(`${BASE_URL}/api/health`);
    check(res, {
      'health status 200': (r) => r.status === 200,
    });
  });

  sleep(0.5);
}