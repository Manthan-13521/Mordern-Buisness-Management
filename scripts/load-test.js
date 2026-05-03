/**
 * ═══════════════════════════════════════════════════════════════════════
 *  AquaSync Load Test — k6 Script
 *  Scenarios: Ramp (1000 VU), Spike (0→1000 in 10s), Soak (300 VU × 60min)
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * Prerequisites:
 *   brew install k6
 * 
 * Usage — individual scenarios:
 *   k6 run --env SCENARIO=ramp   scripts/load-test.js --env BASE_URL=https://your-app.vercel.app
 *   k6 run --env SCENARIO=spike  scripts/load-test.js --env BASE_URL=https://your-app.vercel.app
 *   k6 run --env SCENARIO=soak   scripts/load-test.js --env BASE_URL=http://localhost:3000
 * 
 * Default (no SCENARIO env): runs ramp test
 * 
 * Required env vars:
 *   BASE_URL   — Target host
 *   AUTH_TOKEN  — Valid session token for authenticated routes
 *   SCENARIO   — ramp | spike | soak (default: ramp)
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// ── Custom Metrics ────────────────────────────────────────────────
const dashboardLatency = new Trend('dashboard_latency', true);
const membersLatency = new Trend('members_latency', true);
const paymentsLatency = new Trend('payments_latency', true);
const errorRate = new Rate('errors');

// ── Scenario Selection ────────────────────────────────────────────
const SCENARIO = __ENV.SCENARIO || 'ramp';

const scenarios = {
    // Scenario 1: Gradual ramp to 1000 VU — standard load test
    ramp: {
        sustained_load: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '30s', target: 100 },
                { duration: '1m', target: 500 },
                { duration: '1m', target: 1000 },
                { duration: '5m', target: 1000 },
                { duration: '1m', target: 0 },
            ],
        },
    },

    // Scenario 2: Spike — reveals cold start + connection handling issues
    // 0 → 1000 VU in 10 seconds (Vercel cold start stress)
    spike: {
        spike_test: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '10s', target: 1000 },   // Instant spike
                { duration: '1m', target: 1000 },    // Hold peak
                { duration: '10s', target: 0 },       // Drop
            ],
        },
    },

    // Scenario 3: Soak — reveals memory leaks + connection exhaustion
    // 300 VU sustained for 60 minutes
    soak: {
        soak_test: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '2m', target: 300 },      // Ramp up
                { duration: '60m', target: 300 },     // Sustain
                { duration: '2m', target: 0 },         // Cool down
            ],
        },
    },
};

export const options = {
    scenarios: scenarios[SCENARIO] || scenarios.ramp,
    thresholds: {
        // ── Universal Thresholds ────────────────────────────────
        'dashboard_latency': ['p(95)<2000'],
        'members_latency': ['p(95)<1500'],
        'payments_latency': ['p(95)<1000'],
        'http_req_duration': ['p(95)<2000'],
        'errors': ['rate<0.05'],
        'http_req_failed': ['rate<0.05'],
        
        // ── Spike-specific: tighter latency ─────────────────────
        ...(SCENARIO === 'spike' ? {
            'http_req_duration': ['p(95)<500'],
            'errors': ['rate<0.01'],
        } : {}),

        // ── Soak-specific: no growth allowed ─────────────────────
        ...(SCENARIO === 'soak' ? {
            'errors': ['rate<0.005'],
        } : {}),
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';

const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': AUTH_TOKEN ? `Bearer ${AUTH_TOKEN}` : '',
    'Cookie': AUTH_TOKEN ? `next-auth.session-token=${AUTH_TOKEN}` : '',
};

// ── Shared Checks (applied to ALL scenarios) ──────────────────────
function checkResponse(res, name) {
    const passed = check(res, {
        [`${name}: status 200`]: (r) => r.status === 200,
        [`${name}: no 503`]: (r) => r.status !== 503,
        [`${name}: no 429 on first attempt`]: (r) => r.status !== 429,
        [`${name}: has valid body`]: (r) => {
            try {
                const body = JSON.parse(r.body);
                return body !== null && typeof body === 'object';
            } catch { return false; }
        },
    });
    if (!passed) errorRate.add(1);
    else errorRate.add(0);
    return passed;
}

// ── Test Scenarios ────────────────────────────────────────────────
export default function () {
    group('App Init (Consolidated)', () => {
        const res = http.get(`${BASE_URL}/api/app-init`, {
            headers: authHeaders,
            tags: { name: 'app-init' },
        });
        dashboardLatency.add(res.timings.duration);
        checkResponse(res, 'app-init');
    });

    sleep(1);

    group('Dashboard', () => {
        const res = http.get(`${BASE_URL}/api/dashboard`, {
            headers: authHeaders,
            tags: { name: 'dashboard' },
        });
        dashboardLatency.add(res.timings.duration);
        checkResponse(res, 'dashboard');
    });

    sleep(0.5);

    group('Members List', () => {
        const res = http.get(`${BASE_URL}/api/members?page=1&limit=12`, {
            headers: authHeaders,
            tags: { name: 'members' },
        });
        membersLatency.add(res.timings.duration);
        checkResponse(res, 'members');
    });

    sleep(0.5);

    group('Payments List', () => {
        const res = http.get(`${BASE_URL}/api/payments?page=1&limit=20`, {
            headers: authHeaders,
            tags: { name: 'payments' },
        });
        paymentsLatency.add(res.timings.duration);
        checkResponse(res, 'payments');
    });

    sleep(2);
}

// ── Summary Reporter ──────────────────────────────────────────────
export function handleSummary(data) {
    const summary = {
        scenario: SCENARIO,
        dashboard_p95: data.metrics.dashboard_latency?.values?.['p(95)'] || 'N/A',
        members_p95: data.metrics.members_latency?.values?.['p(95)'] || 'N/A',
        payments_p95: data.metrics.payments_latency?.values?.['p(95)'] || 'N/A',
        error_rate: data.metrics.errors?.values?.rate || 0,
        total_requests: data.metrics.http_reqs?.values?.count || 0,
        http_req_p95: data.metrics.http_req_duration?.values?.['p(95)'] || 'N/A',
    };

    console.log('\n═══════════════════════════════════════');
    console.log(`  AquaSync Load Test — ${SCENARIO.toUpperCase()}`);
    console.log('═══════════════════════════════════════');
    console.log(`  Dashboard P95: ${summary.dashboard_p95}ms`);
    console.log(`  Members P95:   ${summary.members_p95}ms`);
    console.log(`  Payments P95:  ${summary.payments_p95}ms`);
    console.log(`  HTTP P95:      ${summary.http_req_p95}ms`);
    console.log(`  Error Rate:    ${(summary.error_rate * 100).toFixed(2)}%`);
    console.log(`  Total Reqs:    ${summary.total_requests}`);
    console.log('═══════════════════════════════════════');

    if (SCENARIO === 'spike') {
        console.log('\n  ⚡ SPIKE PASS CRITERIA:');
        console.log(`    P95 < 500ms: ${summary.http_req_p95 < 500 ? '✅' : '❌'}`);
        console.log(`    Error < 1%:  ${summary.error_rate < 0.01 ? '✅' : '❌'}`);
    }
    if (SCENARIO === 'soak') {
        console.log('\n  🔋 SOAK PASS CRITERIA:');
        console.log(`    Error < 0.5%: ${summary.error_rate < 0.005 ? '✅' : '❌'}`);
        console.log(`    No 503s:      (check individual request logs)`);
    }
    console.log('');

    return {
        stdout: JSON.stringify(summary, null, 2),
    };
}
