/**
 * k6 Load Test — AquaSync SaaS
 * Progressive load: 1→10→25→50→100 concurrent users
 * Target: http://localhost:3000
 *
 * Usage:
 *   k6 run tests/k6-load-test.js --env SCENARIO=smoke    # 1 VU
 *   k6 run tests/k6-load-test.js --env SCENARIO=light    # 10 VU
 *   k6 run tests/k6-load-test.js --env SCENARIO=medium   # 25 VU
 *   k6 run tests/k6-load-test.js --env SCENARIO=heavy    # 50 VU
 *   k6 run tests/k6-load-test.js                          # 100 VU (default)
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

const errorRate = new Rate('errors');
const authErrors = new Counter('auth_errors');
const serverErrors = new Counter('server_errors');
const rateLimitErrors = new Counter('rate_limit_errors');

// Per-endpoint trends
const trendMembers = new Trend('members_duration', true);
const trendPayments = new Trend('payments_duration', true);
const trendDashboard = new Trend('dashboard_duration', true);
const trendPlans = new Trend('plans_duration', true);
const trendOccupancy = new Trend('occupancy_duration', true);
const trendHealth = new Trend('health_duration', true);
const trendAnalytics = new Trend('analytics_duration', true);
const trendHostel = new Trend('hostel_duration', true);
const trendBusiness = new Trend('business_duration', true);
const trendSuperAdmin = new Trend('superadmin_duration', true);

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const SCENARIO = __ENV.SCENARIO || 'full';

const scenarios = {
  smoke: {
    smoke: { executor: 'constant-vus', vus: 1, duration: '30s', tags: { scenario: 'smoke' } },
  },
  light: {
    light: { executor: 'constant-vus', vus: 10, duration: '1m', tags: { scenario: 'light' } },
  },
  medium: {
    medium: { executor: 'constant-vus', vus: 25, duration: '1m', tags: { scenario: 'medium' } },
  },
  heavy: {
    heavy: { executor: 'constant-vus', vus: 50, duration: '2m', tags: { scenario: 'heavy' } },
  },
  full: {
    ramp: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 1 },   // Warmup
        { duration: '30s', target: 10 },   // Light load
        { duration: '30s', target: 25 },   // Medium
        { duration: '60s', target: 50 },   // Heavy
        { duration: '30s', target: 100 },  // Peak
        { duration: '30s', target: 0 },    // Cooldown
      ],
      tags: { scenario: 'full' },
    },
  },
};

export const options = {
  scenarios: scenarios[SCENARIO] || scenarios.full,
  thresholds: {
    http_req_duration: ['p(95)<2000', 'p(99)<5000'],
    http_req_failed: ['rate<0.05'],
    errors: ['rate<0.05'],
    server_errors: ['count<10'],
  },
  noConnectionReuse: false,
};

const ENDPOINTS = {
  // Pool module
  members:      '/api/members?page=1&limit=20',
  payments:     '/api/payments?page=1&limit=10',
  plans:        '/api/plans',
  dashboard:    '/api/dashboard',
  occupancy:    '/api/occupancy',
  analytics:    '/api/analytics/summary',
  monthlyIncome: '/api/analytics/monthly-income',
  monthlyMembers: '/api/analytics/monthly-members',
  defaulters:   '/api/analytics/defaulters',
  entry:        '/api/entry',
  health:       '/api/metrics/health',
  warmup:       '/api/warmup',
  
  // Hostel
  hostelDashboard: '/api/hostel/dashboard',
  hostelMembers:   '/api/hostel/members?page=1&limit=10',
  hostelPayments:  '/api/hostel/payments?page=1&limit=10',
  hostelRooms:     '/api/hostel/rooms',
  hostelStaff:     '/api/hostel/staff?page=1&limit=10',
  
  // Business
  bizAnalytics:    '/api/business/analytics',
  bizCustomers:    '/api/business/customers',
  bizTransactions: '/api/business/transactions',
  bizPayments:     '/api/business/payments',
  bizStock:        '/api/business/stock',
  bizSales:        '/api/business/sales',
  
  // Super Admin
  saDashboard:     '/api/superadmin/dashboard',
  saChart:         '/api/superadmin/dashboard/chart',
  saPools:         '/api/superadmin/pools',
  saHostels:       '/api/superadmin/hostels',
  saBusinesses:    '/api/superadmin/businesses',
};

function hitEndpoint(url, trend, name) {
  const res = http.get(`${BASE_URL}${url}`, {
    headers: { 'Accept': 'application/json' },
    timeout: '30s',
    tags: { endpoint: name },
  });
  
  trend.add(res.timings.duration);
  
  const passed = check(res, {
    [`${name} status 2xx`]: (r) => r.status >= 200 && r.status < 300,
  });
  
  errorRate.add(!passed);
  
  if (res.status === 500) serverErrors.add(1);
  if (res.status === 429) rateLimitErrors.add(1);
  if (res.status === 401) authErrors.add(1);
  
  if (!passed && __VU <= 2) {
    console.log(`[${name}] ${res.status}: ${res.body?.substring(0, 100)}`);
  }
  
  return res;
}

// Weighted endpoint selection — simulates real traffic mix
function selectEndpoints() {
  const pool = [
    { url: ENDPOINTS.members, trend: trendMembers, name: 'members', weight: 15 },
    { url: ENDPOINTS.payments, trend: trendPayments, name: 'payments', weight: 10 },
    { url: ENDPOINTS.dashboard, trend: trendDashboard, name: 'dashboard', weight: 20 },
    { url: ENDPOINTS.plans, trend: trendPlans, name: 'plans', weight: 5 },
    { url: ENDPOINTS.occupancy, trend: trendOccupancy, name: 'occupancy', weight: 10 },
    { url: ENDPOINTS.analytics, trend: trendAnalytics, name: 'analytics', weight: 5 },
    { url: ENDPOINTS.health, trend: trendHealth, name: 'health', weight: 15 },
    { url: ENDPOINTS.hostelDashboard, trend: trendHostel, name: 'hostel_dash', weight: 5 },
    { url: ENDPOINTS.bizAnalytics, trend: trendBusiness, name: 'biz_analytics', weight: 5 },
    { url: ENDPOINTS.saDashboard, trend: trendSuperAdmin, name: 'sa_dash', weight: 5 },
    { url: ENDPOINTS.monthlyIncome, trend: trendAnalytics, name: 'monthly_income', weight: 3 },
    { url: ENDPOINTS.defaulters, trend: trendAnalytics, name: 'defaulters', weight: 2 },
  ];
  
  // Weighted random selection
  const totalWeight = pool.reduce((s, e) => s + e.weight, 0);
  let rand = Math.random() * totalWeight;
  for (const ep of pool) {
    rand -= ep.weight;
    if (rand <= 0) return ep;
  }
  return pool[0];
}

export default function () {
  const ep = selectEndpoints();
  hitEndpoint(ep.url, ep.trend, ep.name);
  sleep(0.1 + Math.random() * 0.3); // 100-400ms think time
}

export function handleSummary(data) {
  const p95 = data.metrics?.http_req_duration?.values?.['p(95)'] || 0;
  const p99 = data.metrics?.http_req_duration?.values?.['p(99)'] || 0;
  const avg = data.metrics?.http_req_duration?.values?.avg || 0;
  const med = data.metrics?.http_req_duration?.values?.med || 0;
  const errRate = (data.metrics?.http_req_failed?.values?.rate || 0) * 100;
  const totalReqs = data.metrics?.http_reqs?.values?.count || 0;
  const rps = data.metrics?.http_reqs?.values?.rate || 0;
  const serverErrCount = data.metrics?.server_errors?.values?.count || 0;
  const authErrCount = data.metrics?.auth_errors?.values?.count || 0;
  const rateLimitCount = data.metrics?.rate_limit_errors?.values?.count || 0;

  const getPerf = (name) => {
    const m = data.metrics?.[name];
    if (!m) return { p95: 'N/A', avg: 'N/A' };
    const p = m.values?.['p(95)'];
    const a = m.values?.avg;
    return {
      p95: typeof p === 'number' ? p.toFixed(0) + 'ms' : 'N/A',
      avg: typeof a === 'number' ? a.toFixed(0) + 'ms' : 'N/A',
    };
  };

  const summary = `
╔══════════════════════════════════════════════════════════════════╗
║           AquaSync — k6 Load Test Results                       ║
╠══════════════════════════════════════════════════════════════════╣
║  Timestamp:       ${new Date().toISOString().padEnd(40)}║
║  Scenario:        ${(SCENARIO + ' (' + data.state?.vus + ' VUs)').padEnd(40)}║
╠══════════════════════════════════════════════════════════════════╣
║  📊 OVERALL                                                     ║
║  Total Requests:  ${String(totalReqs).padEnd(40)}║
║  Avg RPS:         ${String(rps.toFixed(1)).padEnd(40)}║
║  Error Rate:      ${(errRate.toFixed(2) + '%').padEnd(40)}║
║  500 Errors:      ${String(serverErrCount).padEnd(40)}║
║  401 Errors:      ${String(authErrCount).padEnd(40)}║
║  429 Errors:      ${String(rateLimitCount).padEnd(40)}║
╠══════════════════════════════════════════════════════════════════╣
║  ⚡ LATENCY                                                     ║
║  Average:         ${(avg.toFixed(0) + 'ms').padEnd(40)}║
║  Median:          ${(med.toFixed(0) + 'ms').padEnd(40)}║
║  P95:             ${(typeof p95 === 'number' ? p95.toFixed(0) + 'ms' : p95).padEnd(40)}║
║  P99:             ${(typeof p99 === 'number' ? p99.toFixed(0) + 'ms' : p99).padEnd(40)}║
╠══════════════════════════════════════════════════════════════════╣
║  📋 PER-ENDPOINT P95                                            ║
║  Members:         ${getPerf('members_duration').p95.padEnd(40)}║
║  Payments:        ${getPerf('payments_duration').p95.padEnd(40)}║
║  Dashboard:       ${getPerf('dashboard_duration').p95.padEnd(40)}║
║  Plans:           ${getPerf('plans_duration').p95.padEnd(40)}║
║  Occupancy:       ${getPerf('occupancy_duration').p95.padEnd(40)}║
║  Health:          ${getPerf('health_duration').p95.padEnd(40)}║
║  Analytics:       ${getPerf('analytics_duration').p95.padEnd(40)}║
║  Hostel:          ${getPerf('hostel_duration').p95.padEnd(40)}║
║  Business:        ${getPerf('business_duration').p95.padEnd(40)}║
║  SuperAdmin:      ${getPerf('superadmin_duration').p95.padEnd(40)}║
╠══════════════════════════════════════════════════════════════════╣
║  🎯 THRESHOLDS                                                  ║
║  P95 < 2000ms:    ${(typeof p95 === 'number' && p95 < 2000 ? '✅ PASS' : p95 >= 2000 ? '❌ FAIL' : '⚪ N/A').padEnd(40)}║
║  Errors < 5%:     ${(errRate < 5 ? '✅ PASS' : '❌ FAIL').padEnd(40)}║
║  500s < 10:       ${(serverErrCount < 10 ? '✅ PASS' : '❌ FAIL').padEnd(40)}║
╚══════════════════════════════════════════════════════════════════╝
`;
  console.log(summary);
  return { stdout: summary };
}
