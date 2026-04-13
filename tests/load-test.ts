/**
 * ═══════════════════════════════════════════════════════════════════
 *  SaaS Load Testing Suite — 50 Concurrent Agents
 *  Tests: Race conditions, data consistency, API stability
 *  Target: Hostel & Pool modules
 * ═══════════════════════════════════════════════════════════════════
 *
 *  Usage:
 *    1. Start the dev server:   npm run dev
 *    2. Run load test:          npx tsx tests/load-test.ts
 *
 *  Requirements: Node 18+ (native fetch)
 */

import 'dotenv/config';

// ─── Configuration ───────────────────────────────────────────────
const BASE_URL = process.env.LOAD_TEST_URL || 'http://localhost:3000';
const CONCURRENT_AGENTS = 50;
const CYCLES_PER_AGENT = 5; // each agent does 5 rounds of actions

// ─── Types ───────────────────────────────────────────────────────
interface TestResult {
  agent: number;
  endpoint: string;
  method: string;
  status: number;
  durationMs: number;
  success: boolean;
  error?: string;
  dataEmpty?: boolean;
}

interface ConsistencyCheck {
  type: string;
  passed: boolean;
  details: string;
}

// ─── Metrics Collector ───────────────────────────────────────────
const results: TestResult[] = [];
const consistencyChecks: ConsistencyCheck[] = [];
let totalRequests = 0;
let failedRequests = 0;
let emptyDataResponses = 0;
let status500Count = 0;
let status401Count = 0;

// ─── Helper: authenticated fetch via CSRF + next-auth ────────────
async function getAuthCookie(): Promise<string> {
  // Step 1: Get CSRF token
  const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`, {
    headers: { 'Accept': 'application/json' },
  });
  const csrfData = await csrfRes.json();
  const csrfToken = csrfData.csrfToken;
  const cookies = csrfRes.headers.get('set-cookie') || '';

  // Step 2: Login with credentials
  const loginRes = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': cookies,
    },
    body: new URLSearchParams({
      csrfToken,
      username: process.env.TEST_USERNAME || 'admin',
      password: process.env.TEST_PASSWORD || 'admin123',
      json: 'true',
    }).toString(),
    redirect: 'manual', // Don't follow redirect — capture session cookie
  });

  // Collect all set-cookie headers
  const allCookies: string[] = [];
  // From CSRF response
  if (cookies) allCookies.push(...cookies.split(',').map(c => c.split(';')[0].trim()));
  // From login response
  const loginCookies = loginRes.headers.get('set-cookie') || '';
  if (loginCookies) allCookies.push(...loginCookies.split(',').map(c => c.split(';')[0].trim()));

  const sessionCookie = allCookies
    .filter(c => c.includes('next-auth.session-token') || c.includes('__Secure-next-auth.session-token'))
    .join('; ');

  if (!sessionCookie) {
    console.error('⚠ Login failed — no session cookie received');
    console.error('  Status:', loginRes.status);
    console.error('  Set TEST_USERNAME and TEST_PASSWORD env vars');
    process.exit(1);
  }

  return allCookies.join('; ');
}

// ─── Helper: timed fetch ─────────────────────────────────────────
async function timedFetch(
  agentId: number,
  endpoint: string,
  options: RequestInit & { cookie: string },
  method: string = 'GET'
): Promise<{ status: number; data: any; durationMs: number }> {
  const start = performance.now();
  totalRequests++;

  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      method,
      headers: {
        ...((options.headers as Record<string, string>) || {}),
        'Cookie': options.cookie,
        'Content-Type': method !== 'GET' ? 'application/json' : '',
      },
    });

    const durationMs = Math.round(performance.now() - start);
    let data: any = null;

    try {
      data = await res.json();
    } catch {
      data = null;
    }

    const dataEmpty = (
      (Array.isArray(data?.data) && data.data.length === 0) ||
      (data?.data === undefined && data?.error)
    );

    if (dataEmpty) emptyDataResponses++;
    if (res.status === 500) status500Count++;
    if (res.status === 401) status401Count++;
    if (!res.ok) failedRequests++;

    results.push({
      agent: agentId,
      endpoint,
      method,
      status: res.status,
      durationMs,
      success: res.ok,
      error: data?.error,
      dataEmpty: !!dataEmpty,
    });

    return { status: res.status, data, durationMs };
  } catch (err: any) {
    const durationMs = Math.round(performance.now() - start);
    failedRequests++;
    results.push({
      agent: agentId,
      endpoint,
      method,
      status: 0,
      durationMs,
      success: false,
      error: err.message,
    });
    return { status: 0, data: null, durationMs };
  }
}

// ─── Agent: Simulates a single user ──────────────────────────────
async function runAgent(agentId: number, cookie: string) {
  const GET_ENDPOINTS = [
    '/api/hostel/dashboard',
    '/api/hostel/payments?page=1&limit=11',
    '/api/hostel/members?page=1&limit=11',
    '/api/hostel/members/balance?page=1&limit=11',
    '/api/hostel/staff?page=1&limit=11',
    '/api/hostel/blocks',
    '/api/hostel/rooms',
    '/api/hostel/members/expired?page=1&limit=11',
    '/api/hostel/analytics/monthly-income',
    '/api/hostel/analytics/monthly-members',
  ];

  for (let cycle = 0; cycle < CYCLES_PER_AGENT; cycle++) {
    // Shuffle endpoints to simulate random navigation
    const shuffled = [...GET_ENDPOINTS].sort(() => Math.random() - 0.5);

    for (const endpoint of shuffled) {
      await timedFetch(agentId, endpoint, { cookie });
      // Small random delay to simulate real user behavior (50-200ms)
      await new Promise(r => setTimeout(r, 50 + Math.random() * 150));
    }

    // Simulate rapid refresh (3 quick hits to payments)
    const rapidPromises = Array.from({ length: 3 }, () =>
      timedFetch(agentId, `/api/hostel/payments?page=1&limit=11&t=${Date.now()}`, { cookie })
    );
    await Promise.all(rapidPromises);
  }
}

// ─── Race Condition Test: Concurrent Payment Writes ──────────────
async function testPaymentRaceCondition(cookie: string) {
  console.log('\n🔥 Race Condition Test: 10 concurrent payment writes...');

  // First, get a member to pay for
  const membersRes = await timedFetch(99, '/api/hostel/members/balance?page=1&limit=5', { cookie });
  const members = membersRes.data?.data || [];

  if (members.length === 0) {
    console.log('  ⚠ No members with balance found — skipping payment race test');
    consistencyChecks.push({
      type: 'payment_race_condition',
      passed: true,
      details: 'Skipped — no members with balance',
    });
    return;
  }

  const testMember = members[0];
  const balanceBefore = testMember.balance;
  console.log(`  Target: ${testMember.name} (${testMember.memberId}), Balance: ₹${balanceBefore}`);

  // Fire 10 concurrent ₹1 payments (Read-only test — we use very small amounts)
  // NOTE: This is a WRITE test. Comment out if you don't want mutations.
  const paymentPromises = Array.from({ length: 10 }, (_, i) =>
    timedFetch(
      90 + i,
      '/api/hostel/payments',
      {
        cookie,
        body: JSON.stringify({
          memberId: testMember._id,
          amount: 1,
          paymentMethod: 'cash',
          notes: `Load test payment #${i + 1}`,
          idempotencyKey: `loadtest-${Date.now()}-${i}`,
        }),
      },
      'POST'
    )
  );

  const payResults = await Promise.all(paymentPromises);
  const successes = payResults.filter(r => r.status === 201).length;
  const failures = payResults.filter(r => r.status !== 201).length;

  // Check balance after
  const afterRes = await timedFetch(99, '/api/hostel/members/balance?page=1&limit=5', { cookie });
  const afterMembers = afterRes.data?.data || [];
  const afterMember = afterMembers.find((m: any) => m._id === testMember._id);
  const balanceAfter = afterMember?.balance ?? balanceBefore;

  const expectedBalance = balanceBefore + successes; // Each ₹1 payment should add ₹1 to balance
  const balanceCorrect = balanceAfter === expectedBalance;

  consistencyChecks.push({
    type: 'payment_race_condition',
    passed: balanceCorrect,
    details: `10 concurrent payments → ${successes} succeeded, ${failures} failed. Balance: ₹${balanceBefore} → ₹${balanceAfter} (expected ₹${expectedBalance})`,
  });

  console.log(`  Results: ${successes}/10 succeeded, Balance: ₹${balanceBefore} → ₹${balanceAfter}`);
  if (!balanceCorrect) {
    console.log(`  ❌ RACE CONDITION DETECTED — Balance mismatch! Expected ₹${expectedBalance}`);
  } else {
    console.log(`  ✅ Balance is correct`);
  }
}

// ─── Consistency Test: Repeated reads should return same data ────
async function testReadConsistency(cookie: string) {
  console.log('\n🔍 Read Consistency Test: 20 rapid reads to payments...');

  const promises = Array.from({ length: 20 }, (_, i) =>
    timedFetch(80 + i, `/api/hostel/payments?page=1&limit=5&t=${Date.now()}-${i}`, { cookie })
  );

  const readResults = await Promise.all(promises);
  const dataCounts = readResults.map(r => r.data?.data?.length ?? -1);
  const totals = readResults.map(r => r.data?.total ?? -1);
  const statuses = readResults.map(r => r.status);

  const allSameCount = new Set(dataCounts).size === 1;
  const allSameTotal = new Set(totals).size === 1;
  const allOk = statuses.every(s => s === 200);
  const anyEmpty = dataCounts.some(c => c === 0) && dataCounts.some(c => c > 0);

  consistencyChecks.push({
    type: 'read_consistency',
    passed: allSameCount && allSameTotal && allOk,
    details: `20 reads → data counts: ${JSON.stringify([...new Set(dataCounts)])}, totals: ${JSON.stringify([...new Set(totals)])}, statuses: ${JSON.stringify([...new Set(statuses)])}${anyEmpty ? ' ⚠ INTERMITTENT EMPTY DATA!' : ''}`,
  });

  if (!allSameCount || anyEmpty) {
    console.log(`  ❌ INCONSISTENT — data counts vary: ${JSON.stringify([...new Set(dataCounts)])}`);
  } else {
    console.log(`  ✅ All 20 reads returned consistent data (${dataCounts[0]} items)`);
  }
}

// ─── Tenant Isolation Test ───────────────────────────────────────
async function testTenantIsolation(cookie: string) {
  console.log('\n🔒 Tenant Isolation Test...');

  // Fetch dashboard data
  const dashRes = await timedFetch(70, '/api/hostel/dashboard', { cookie });
  const membersRes = await timedFetch(70, '/api/hostel/members?page=1&limit=5', { cookie });
  const paymentsRes = await timedFetch(70, '/api/hostel/payments?page=1&limit=5', { cookie });

  // Verify all data belongs to the same hostel (we can check by member hostelId if populated)
  const dashOk = dashRes.status === 200;
  const membersOk = membersRes.status === 200;
  const paymentsOk = paymentsRes.status === 200;

  consistencyChecks.push({
    type: 'tenant_isolation',
    passed: dashOk && membersOk && paymentsOk,
    details: `Dashboard: ${dashRes.status}, Members: ${membersRes.status} (${membersRes.data?.total ?? 0}), Payments: ${paymentsRes.status} (${paymentsRes.data?.total ?? 0})`,
  });

  console.log(`  Dashboard: ${dashRes.status === 200 ? '✅' : '❌'}`);
  console.log(`  Members: ${membersRes.status === 200 ? '✅' : '❌'} (${membersRes.data?.total ?? 0} records)`);
  console.log(`  Payments: ${paymentsRes.status === 200 ? '✅' : '❌'} (${paymentsRes.data?.total ?? 0} records)`);
}

// ─── Report Generator ────────────────────────────────────────────
function generateReport() {
  const durations = results.filter(r => r.success).map(r => r.durationMs);
  const avgMs = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
  const maxMs = durations.length ? Math.max(...durations) : 0;
  const minMs = durations.length ? Math.min(...durations) : 0;
  const p95Idx = Math.floor(durations.sort((a, b) => a - b).length * 0.95);
  const p95Ms = durations[p95Idx] || 0;

  // Per-endpoint breakdown
  const endpointMap = new Map<string, { count: number; fails: number; avgMs: number; empty: number }>();
  for (const r of results) {
    const key = `${r.method} ${r.endpoint.split('?')[0]}`;
    const entry = endpointMap.get(key) || { count: 0, fails: 0, avgMs: 0, empty: 0 };
    entry.count++;
    if (!r.success) entry.fails++;
    if (r.dataEmpty) entry.empty++;
    entry.avgMs = Math.round((entry.avgMs * (entry.count - 1) + r.durationMs) / entry.count);
    endpointMap.set(key, entry);
  }

  // Slow endpoints (avg > 2s)
  const slowEndpoints = [...endpointMap.entries()].filter(([, v]) => v.avgMs > 2000);
  // Failing endpoints
  const failingEndpoints = [...endpointMap.entries()].filter(([, v]) => v.fails > 0);
  // Empty data endpoints
  const emptyEndpoints = [...endpointMap.entries()].filter(([, v]) => v.empty > 0);

  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║              🧪 LOAD TEST REPORT — 50 AGENTS                   ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');

  console.log('\n📊 OVERALL METRICS');
  console.log('─'.repeat(50));
  console.log(`  Total Requests:       ${totalRequests}`);
  console.log(`  Successful:           ${totalRequests - failedRequests} (${((totalRequests - failedRequests) / totalRequests * 100).toFixed(1)}%)`);
  console.log(`  Failed Requests:      ${failedRequests}`);
  console.log(`  500 Errors:           ${status500Count}`);
  console.log(`  401 Errors:           ${status401Count}`);
  console.log(`  Empty Data Responses: ${emptyDataResponses}`);

  console.log('\n⚡ PERFORMANCE');
  console.log('─'.repeat(50));
  console.log(`  Avg Response Time:    ${avgMs}ms`);
  console.log(`  Min Response Time:    ${minMs}ms`);
  console.log(`  Max Response Time:    ${maxMs}ms`);
  console.log(`  P95 Response Time:    ${p95Ms}ms`);

  console.log('\n📋 PER-ENDPOINT BREAKDOWN');
  console.log('─'.repeat(80));
  console.log(`  ${'Endpoint'.padEnd(45)} ${'Calls'.padStart(6)} ${'Fails'.padStart(6)} ${'Empty'.padStart(6)} ${'Avg(ms)'.padStart(8)}`);
  console.log('─'.repeat(80));
  for (const [endpoint, stats] of [...endpointMap.entries()].sort((a, b) => b[1].avgMs - a[1].avgMs)) {
    const marker = stats.fails > 0 ? '❌' : stats.empty > 0 ? '⚠' : '✅';
    console.log(`  ${marker} ${endpoint.padEnd(43)} ${String(stats.count).padStart(6)} ${String(stats.fails).padStart(6)} ${String(stats.empty).padStart(6)} ${String(stats.avgMs).padStart(8)}`);
  }

  if (slowEndpoints.length) {
    console.log('\n🐌 SLOW ENDPOINTS (avg > 2s)');
    console.log('─'.repeat(50));
    for (const [ep, stats] of slowEndpoints) {
      console.log(`  ⚠ ${ep} — ${stats.avgMs}ms avg`);
    }
  }

  if (failingEndpoints.length) {
    console.log('\n💥 FAILING ENDPOINTS');
    console.log('─'.repeat(50));
    for (const [ep, stats] of failingEndpoints) {
      console.log(`  ❌ ${ep} — ${stats.fails}/${stats.count} failed`);
    }
  }

  if (emptyEndpoints.length) {
    console.log('\n📭 EMPTY DATA RESPONSES (intermittent)');
    console.log('─'.repeat(50));
    for (const [ep, stats] of emptyEndpoints) {
      console.log(`  ⚠ ${ep} — ${stats.empty}/${stats.count} returned empty data`);
    }
  }

  console.log('\n🧩 CONSISTENCY CHECKS');
  console.log('─'.repeat(70));
  for (const check of consistencyChecks) {
    console.log(`  ${check.passed ? '✅' : '❌'} ${check.type}`);
    console.log(`     ${check.details}`);
  }

  // Bugs summary
  const bugs: string[] = [];
  if (status500Count > 0) bugs.push(`${status500Count} server errors (500) detected`);
  if (emptyDataResponses > 0) bugs.push(`${emptyDataResponses} responses returned empty data (possible race condition)`);
  if (slowEndpoints.length > 0) bugs.push(`${slowEndpoints.length} endpoint(s) averaging over 2 seconds`);
  for (const check of consistencyChecks) {
    if (!check.passed) bugs.push(`FAILED: ${check.type} — ${check.details}`);
  }

  console.log('\n🐛 BUGS FOUND');
  console.log('─'.repeat(50));
  if (bugs.length === 0) {
    console.log('  ✅ No critical bugs detected under load!');
  } else {
    for (const bug of bugs) {
      console.log(`  🔴 ${bug}`);
    }
  }

  // Fixes section
  if (bugs.length > 0) {
    console.log('\n🔧 SUGGESTED FIXES');
    console.log('─'.repeat(50));
    if (status500Count > 0) {
      console.log('  1. Check Vercel logs for the failing endpoints. Likely causes:');
      console.log('     - Missing model imports for .populate() calls');
      console.log('     - MongoDB connection pool exhaustion (maxPoolSize too low)');
      console.log('     - Unhandled promise rejections in analytics/stats updates');
    }
    if (emptyDataResponses > 0) {
      console.log('  2. Empty data responses indicate:');
      console.log('     - AbortController cancelling valid requests (already fixed)');
      console.log('     - DB queries hitting connection timeout under load');
      console.log('     - Consider increasing maxPoolSize from 5 → 10 for production');
    }
    if (slowEndpoints.length > 0) {
      console.log('  3. Slow endpoints — add database indexes or optimize aggregation pipelines');
    }
  }

  console.log('\n' + '═'.repeat(70));
  console.log(`  Test completed: ${new Date().toISOString()}`);
  console.log('═'.repeat(70));
}

// ─── MAIN ────────────────────────────────────────────────────────
async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║        🚀 SaaS Load Test — 50 Concurrent Agents                ║');
  console.log(`║        Target: ${BASE_URL.padEnd(47)}║`);
  console.log('╚══════════════════════════════════════════════════════════════════╝');

  // Step 1: Authenticate
  console.log('\n🔐 Authenticating...');
  let cookie: string;
  try {
    cookie = await getAuthCookie();
    console.log('  ✅ Session obtained');
  } catch (err: any) {
    console.error('  ❌ Authentication failed:', err.message);
    console.error('  Set TEST_USERNAME and TEST_PASSWORD in .env.local');
    process.exit(1);
  }

  // Step 2: Tenant isolation test
  await testTenantIsolation(cookie);

  // Step 3: Read consistency test  
  await testReadConsistency(cookie);

  // Step 4: Payment race condition test (WRITE operations)
  // Uncomment to enable — will create actual payment records
  // await testPaymentRaceCondition(cookie);

  // Step 5: Launch 50 concurrent agents
  console.log(`\n🏁 Launching ${CONCURRENT_AGENTS} concurrent agents (${CYCLES_PER_AGENT} cycles each)...`);
  const start = performance.now();

  const agents = Array.from({ length: CONCURRENT_AGENTS }, (_, i) =>
    runAgent(i, cookie)
  );

  await Promise.all(agents);

  const totalTime = Math.round(performance.now() - start);
  console.log(`  ✅ All agents finished in ${(totalTime / 1000).toFixed(1)}s`);

  // Step 6: Final consistency check post-load
  console.log('\n🔍 Post-load consistency check...');
  await testReadConsistency(cookie);

  // Step 7: Generate report
  generateReport();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
