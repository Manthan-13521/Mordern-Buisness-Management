/**
 * ═══════════════════════════════════════════════════════════════════════
 *  AquaSync Load Test — k6 Script
 *  Tests: Dashboard, Members, Payments under sustained 1000 VU load
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * Prerequisites:
 *   brew install k6
 * 
 * Usage:
 *   k6 run scripts/load-test.js --env BASE_URL=https://your-app.vercel.app
 *   k6 run scripts/load-test.js --env BASE_URL=http://localhost:3000
 * 
 * Required env vars (set in .env or pass via --env):
 *   BASE_URL — Target host
 *   AUTH_TOKEN — Valid JWT token for authenticated routes
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// ── Custom Metrics ────────────────────────────────────────────────
const dashboardLatency = new Trend('dashboard_latency', true);
const membersLatency = new Trend('members_latency', true);
const paymentsLatency = new Trend('payments_latency', true);
const errorRate = new Rate('errors');

// ── Configuration ─────────────────────────────────────────────────
export const options = {
    scenarios: {
        // Ramp up to 1000 virtual users over 2 minutes, sustain for 5 min
        sustained_load: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '30s', target: 100 },   // Warm up
                { duration: '1m', target: 500 },     // Ramp to 500
                { duration: '1m', target: 1000 },    // Ramp to 1000
                { duration: '5m', target: 1000 },    // Sustain 1000
                { duration: '1m', target: 0 },       // Cool down
            ],
        },
    },
    thresholds: {
        // ── Performance Targets ────────────────────────────────
        'dashboard_latency': ['p(95)<2000'],      // Dashboard P95 < 2s
        'members_latency': ['p(95)<1500'],         // Members P95 < 1.5s
        'payments_latency': ['p(95)<1000'],         // Payments P95 < 1s
        'http_req_duration': ['p(95)<2000'],        // All requests P95 < 2s
        'errors': ['rate<0.05'],                    // Error rate < 5%
        'http_req_failed': ['rate<0.05'],           // HTTP failures < 5%
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';

const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': AUTH_TOKEN ? `Bearer ${AUTH_TOKEN}` : '',
    'Cookie': AUTH_TOKEN ? `next-auth.session-token=${AUTH_TOKEN}` : '',
};

// ── Test Scenarios ────────────────────────────────────────────────
export default function () {
    // Simulate realistic user behavior: dashboard → members → payments
    
    group('Dashboard Load', () => {
        const res = http.get(`${BASE_URL}/api/dashboard`, {
            headers: authHeaders,
            tags: { name: 'dashboard' },
        });

        dashboardLatency.add(res.timings.duration);
        
        const passed = check(res, {
            'dashboard: status 200': (r) => r.status === 200,
            'dashboard: has stats': (r) => {
                try {
                    const body = JSON.parse(r.body);
                    return body.stats !== undefined;
                } catch { return false; }
            },
            'dashboard: latency < 2s': (r) => r.timings.duration < 2000,
        });
        
        if (!passed) errorRate.add(1);
        else errorRate.add(0);
    });

    sleep(1); // Simulate user reading dashboard

    group('Members List', () => {
        const res = http.get(`${BASE_URL}/api/members?page=1&limit=12`, {
            headers: authHeaders,
            tags: { name: 'members' },
        });

        membersLatency.add(res.timings.duration);

        const passed = check(res, {
            'members: status 200': (r) => r.status === 200,
            'members: has data array': (r) => {
                try {
                    const body = JSON.parse(r.body);
                    return Array.isArray(body.data);
                } catch { return false; }
            },
            'members: latency < 1.5s': (r) => r.timings.duration < 1500,
        });

        if (!passed) errorRate.add(1);
        else errorRate.add(0);
    });

    sleep(0.5);

    group('Payments List', () => {
        const res = http.get(`${BASE_URL}/api/payments?page=1&limit=20`, {
            headers: authHeaders,
            tags: { name: 'payments' },
        });

        paymentsLatency.add(res.timings.duration);

        const passed = check(res, {
            'payments: status 200': (r) => r.status === 200,
            'payments: latency < 1s': (r) => r.timings.duration < 1000,
        });

        if (!passed) errorRate.add(1);
        else errorRate.add(0);
    });

    sleep(2); // Simulate user activity gap
}

// ── Summary ───────────────────────────────────────────────────────
export function handleSummary(data) {
    const summary = {
        dashboard_p95: data.metrics.dashboard_latency?.values?.['p(95)'] || 'N/A',
        members_p95: data.metrics.members_latency?.values?.['p(95)'] || 'N/A',
        payments_p95: data.metrics.payments_latency?.values?.['p(95)'] || 'N/A',
        error_rate: data.metrics.errors?.values?.rate || 0,
        total_requests: data.metrics.http_reqs?.values?.count || 0,
    };

    console.log('\n═══════════════════════════════════════');
    console.log('  AquaSync Load Test Results');
    console.log('═══════════════════════════════════════');
    console.log(`  Dashboard P95: ${summary.dashboard_p95}ms`);
    console.log(`  Members P95:   ${summary.members_p95}ms`);
    console.log(`  Payments P95:  ${summary.payments_p95}ms`);
    console.log(`  Error Rate:    ${(summary.error_rate * 100).toFixed(2)}%`);
    console.log(`  Total Reqs:    ${summary.total_requests}`);
    console.log('═══════════════════════════════════════\n');

    return {
        stdout: JSON.stringify(summary, null, 2),
    };
}
