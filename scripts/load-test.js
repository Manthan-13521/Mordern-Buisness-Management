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
 *
 *  How it works:
 *    All requests include ?test=true query param.
 *    When LOAD_TEST=true on the server:
 *      - middleware skips auth/subscription/tenant guards
 *      - resolveUser() returns a synthetic admin user (BIZ001)
 *    When LOAD_TEST is not "true" (production default):
 *      - ?test=true is ignored, normal auth is enforced
 * ═══════════════════════════════════════════════════════════════════
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// ── Custom Metrics ───────────────────────────────────────────────
const errorRate = new Rate('errors');
const appInitDuration = new Trend('app_init_duration', true);
const dashboardDuration = new Trend('dashboard_duration', true);

// ── Configuration ────────────────────────────────────────────────
const BASE_URL = __ENV.BASE_URL || 'https://modern-businesses-management.vercel.app';
const TEST_PARAM = 'test=true';

export const options = {
  scenarios: {
    // Smoke test: verify bypass works
    smoke: {
      executor: 'constant-vus',
      vus: 1,
      duration: '5s',
      startTime: '0s',
      tags: { scenario: 'smoke' },
    },
    // Load test: sustained traffic
    load: {
      executor: 'constant-vus',
      vus: 5,
      duration: '10s',
      startTime: '6s',
      tags: { scenario: 'load' },
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<5000'],  // 95% of requests under 5s
    errors: ['rate<0.1'],               // Less than 10% errors
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

// ── Main Test Function ───────────────────────────────────────────
export default function () {
  // 1. App Init (consolidated bootstrap endpoint)
  group('App Init', () => {
    const res = testGet('/api/app-init');
    const passed = check(res, {
      'app-init status 200': (r) => r.status === 200,
      'app-init has body': (r) => r.body && r.body.length > 2,
      'app-init no auth error': (r) => {
        try {
          const body = JSON.parse(r.body);
          return !body.error || body.error !== 'Unauthorized';
        } catch { return true; }
      },
    });
    errorRate.add(!passed);
    appInitDuration.add(res.timings.duration);

    if (res.status !== 200) {
      console.log(`[app-init] STATUS: ${res.status} BODY: ${res.body?.substring(0, 200)}`);
    }
  });

  sleep(0.5);

  // 2. Dashboard
  group('Dashboard', () => {
    const res = testGet('/api/dashboard');
    const passed = check(res, {
      'dashboard status 200': (r) => r.status === 200,
      'dashboard has stats': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.stats !== undefined;
        } catch { return false; }
      },
    });
    errorRate.add(!passed);
    dashboardDuration.add(res.timings.duration);

    if (res.status !== 200) {
      console.log(`[dashboard] STATUS: ${res.status} BODY: ${res.body?.substring(0, 200)}`);
    }
  });

  sleep(0.5);

  // 3. Health check (always-allowed, no auth needed)
  group('Health', () => {
    const res = http.get(`${BASE_URL}/api/health`);
    check(res, {
      'health status 200': (r) => r.status === 200,
    });
  });

  sleep(1);
}