/**
 * ═══════════════════════════════════════════════════════════════════
 *  SaaS Load Testing Suite — 50 Concurrent Agents
 *  Target: https://swimming-pool-system.vercel.app
 *
 *  Usage:
 *    export TEST_USERNAME="your_username"
 *    export TEST_PASSWORD="your_password"
 *    node tests/load-test.mjs
 * ═══════════════════════════════════════════════════════════════════
 */

const BASE_URL = 'https://swimming-pool-system.vercel.app';
const CONCURRENT_AGENTS = 50;
const CYCLES_PER_AGENT = 3;

// ─── Metrics ─────────────────────────────────────────────────────
const results = [];
const consistencyChecks = [];
let totalRequests = 0, failedRequests = 0, emptyDataResponses = 0, status500Count = 0, status401Count = 0;

// ─── Auth: Get session cookie via next-auth CSRF flow ────────────
async function getAuthCookie() {
  const username = process.env.TEST_USERNAME;
  const password = process.env.TEST_PASSWORD;
  if (!username || !password) {
    console.error('❌  Set TEST_USERNAME and TEST_PASSWORD environment variables');
    console.error('    export TEST_USERNAME="your_username"');
    console.error('    export TEST_PASSWORD="your_password"');
    process.exit(1);
  }

  // Step 1: CSRF token
  const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  const csrfCookies = (csrfRes.headers.get('set-cookie') || '').split(',').map(c => c.split(';')[0].trim()).filter(Boolean);

  // Step 2: Login
  const loginRes = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': csrfCookies.join('; '),
    },
    body: new URLSearchParams({ csrfToken, username, password, json: 'true' }).toString(),
    redirect: 'manual',
  });

  const loginCookies = (loginRes.headers.get('set-cookie') || '').split(',').map(c => c.split(';')[0].trim()).filter(Boolean);
  const allCookies = [...csrfCookies, ...loginCookies];
  const sessionCookie = allCookies.filter(c =>
    c.includes('next-auth.session-token') || c.includes('__Secure-next-auth.session-token')
  );

  if (sessionCookie.length === 0) {
    console.error('❌  Login failed — no session cookie. Check credentials.');
    console.error('    Status:', loginRes.status);
    process.exit(1);
  }

  return allCookies.join('; ');
}

// ─── Timed fetch with metrics ────────────────────────────────────
async function timedFetch(agentId, endpoint, cookie, method = 'GET', body = null) {
  const start = performance.now();
  totalRequests++;

  try {
    const opts = {
      method,
      headers: { 'Cookie': cookie },
    };
    if (body) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }

    const res = await fetch(`${BASE_URL}${endpoint}`, opts);
    const durationMs = Math.round(performance.now() - start);
    let data = null;
    try { data = await res.json(); } catch { data = null; }

    const dataEmpty = Array.isArray(data?.data) && data.data.length === 0 && (data?.total ?? 0) === 0;
    if (dataEmpty) emptyDataResponses++;
    if (res.status === 500) status500Count++;
    if (res.status === 401) status401Count++;
    if (!res.ok) failedRequests++;

    results.push({ agent: agentId, endpoint: endpoint.split('?')[0], method, status: res.status, durationMs, success: res.ok, error: data?.error, dataEmpty });
    return { status: res.status, data, durationMs };
  } catch (err) {
    const durationMs = Math.round(performance.now() - start);
    failedRequests++;
    results.push({ agent: agentId, endpoint: endpoint.split('?')[0], method, status: 0, durationMs, success: false, error: err.message });
    return { status: 0, data: null, durationMs };
  }
}

// ─── Single Agent ────────────────────────────────────────────────
async function runAgent(agentId, cookie) {
  const endpoints = [
    '/api/hostel/payments?page=1&limit=11',
    '/api/hostel/members?page=1&limit=11',
    '/api/hostel/members/balance?page=1&limit=11',
    '/api/hostel/staff?page=1&limit=11',
    '/api/hostel/blocks',
  ];

  for (let cycle = 0; cycle < CYCLES_PER_AGENT; cycle++) {
    // Shuffle to simulate random navigation
    const shuffled = [...endpoints].sort(() => Math.random() - 0.5);
    for (const ep of shuffled) {
      await timedFetch(agentId, ep, cookie);
      // Small random delay (50-200ms)
      await new Promise(r => setTimeout(r, 50 + Math.random() * 150));
    }

    // Rapid refresh burst: 3 concurrent hits to payments
    await Promise.all([
      timedFetch(agentId, `/api/hostel/payments?page=1&limit=11&t=${Date.now()}a`, cookie),
      timedFetch(agentId, `/api/hostel/payments?page=1&limit=11&t=${Date.now()}b`, cookie),
      timedFetch(agentId, `/api/hostel/payments?page=1&limit=11&t=${Date.now()}c`, cookie),
    ]);
  }
}

// ─── Test: Read Consistency (20 rapid reads) ─────────────────────
async function testReadConsistency(cookie, label) {
  console.log(`\n🔍 Read Consistency Test (${label}): 20 rapid parallel reads...`);
  const promises = Array.from({ length: 20 }, (_, i) =>
    timedFetch(80 + i, `/api/hostel/payments?page=1&limit=5&t=${Date.now()}-${i}`, cookie)
  );
  const res = await Promise.all(promises);

  const counts = res.map(r => r.data?.data?.length ?? -1);
  const totals = res.map(r => r.data?.total ?? -1);
  const statuses = res.map(r => r.status);
  const anyFlicker = counts.some(c => c === 0) && counts.some(c => c > 0);
  const allSame = new Set(counts).size === 1 && new Set(totals).size === 1;

  consistencyChecks.push({
    type: `read_consistency (${label})`,
    passed: allSame && !anyFlicker,
    details: `counts: ${JSON.stringify([...new Set(counts)])} totals: ${JSON.stringify([...new Set(totals)])} statuses: ${JSON.stringify([...new Set(statuses)])}${anyFlicker ? ' ⚠ FLICKER!' : ''}`,
  });

  console.log(anyFlicker
    ? `  ❌ FLICKER — some reads empty, some not: ${JSON.stringify([...new Set(counts)])}`
    : `  ✅ All 20 reads consistent (${counts[0]} items)`);
}

// ─── Test: Tenant Isolation ──────────────────────────────────────
async function testTenantIsolation(cookie) {
  console.log('\n🔒 Tenant Isolation Test...');
  const [m, p, b] = await Promise.all([
    timedFetch(70, '/api/hostel/members?page=1&limit=3', cookie),
    timedFetch(70, '/api/hostel/payments?page=1&limit=3', cookie),
    timedFetch(70, '/api/hostel/members/balance?page=1&limit=3', cookie),
  ]);

  consistencyChecks.push({
    type: 'tenant_isolation',
    passed: m.status === 200 && p.status === 200 && b.status === 200,
    details: `Members: ${m.status}(${m.data?.total ?? '?'}), Payments: ${p.status}(${p.data?.total ?? '?'}), Balance: ${b.status}(${b.data?.total ?? '?'})`,
  });

  console.log(`  Members: ${m.status === 200 ? '✅' : '❌'} (${m.data?.total ?? 0})`);
  console.log(`  Payments: ${p.status === 200 ? '✅' : '❌'} (${p.data?.total ?? 0})`);
  console.log(`  Balance: ${b.status === 200 ? '✅' : '❌'} (${b.data?.total ?? 0})`);
}

// ─── Report ──────────────────────────────────────────────────────
function generateReport() {
  const ok = results.filter(r => r.success);
  const dur = ok.map(r => r.durationMs).sort((a, b) => a - b);
  const avg = dur.length ? Math.round(dur.reduce((a, b) => a + b, 0) / dur.length) : 0;
  const p95 = dur[Math.floor(dur.length * 0.95)] || 0;
  const max = dur[dur.length - 1] || 0;
  const min = dur[0] || 0;

  // Per-endpoint
  const epMap = new Map();
  for (const r of results) {
    const k = `${r.method} ${r.endpoint}`;
    const e = epMap.get(k) || { count: 0, fails: 0, empty: 0, totalMs: 0 };
    e.count++;
    if (!r.success) e.fails++;
    if (r.dataEmpty) e.empty++;
    e.totalMs += r.durationMs;
    epMap.set(k, e);
  }

  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║           🧪 LOAD TEST REPORT — 50 CONCURRENT AGENTS           ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');

  console.log('\n📊 OVERALL');
  console.log('─'.repeat(50));
  console.log(`  Total Requests:       ${totalRequests}`);
  console.log(`  Successful:           ${totalRequests - failedRequests} (${((totalRequests - failedRequests) / totalRequests * 100).toFixed(1)}%)`);
  console.log(`  Failed:               ${failedRequests}`);
  console.log(`  500 Errors:           ${status500Count}`);
  console.log(`  401 Errors:           ${status401Count}`);
  console.log(`  Empty Data:           ${emptyDataResponses}`);

  console.log('\n⚡ PERFORMANCE');
  console.log('─'.repeat(50));
  console.log(`  Avg:   ${avg}ms`);
  console.log(`  Min:   ${min}ms`);
  console.log(`  Max:   ${max}ms`);
  console.log(`  P95:   ${p95}ms`);

  console.log('\n📋 PER-ENDPOINT');
  console.log('─'.repeat(85));
  console.log(`  ${'Endpoint'.padEnd(48)} ${'Calls'.padStart(6)} ${'Fail'.padStart(5)} ${'Empty'.padStart(6)} ${'Avg ms'.padStart(8)}`);
  console.log('─'.repeat(85));
  for (const [ep, s] of [...epMap.entries()].sort((a, b) => (b[1].totalMs / b[1].count) - (a[1].totalMs / a[1].count))) {
    const avgMs = Math.round(s.totalMs / s.count);
    const icon = s.fails > 0 ? '❌' : s.empty > 0 ? '⚠️ ' : '✅';
    console.log(`  ${icon} ${ep.padEnd(46)} ${String(s.count).padStart(6)} ${String(s.fails).padStart(5)} ${String(s.empty).padStart(6)} ${String(avgMs).padStart(8)}`);
  }

  console.log('\n🧩 CONSISTENCY CHECKS');
  console.log('─'.repeat(70));
  for (const c of consistencyChecks) {
    console.log(`  ${c.passed ? '✅' : '❌'} ${c.type}`);
    console.log(`     ${c.details}`);
  }

  const bugs = [];
  if (status500Count > 0) bugs.push(`${status500Count} server errors (500)`);
  if (emptyDataResponses > 0) bugs.push(`${emptyDataResponses} empty data responses (possible flicker bug)`);
  if (status401Count > (totalRequests * 0.05)) bugs.push(`High 401 rate: ${status401Count} unauthorized`);
  const slow = [...epMap.entries()].filter(([, s]) => (s.totalMs / s.count) > 3000);
  if (slow.length) bugs.push(`${slow.length} endpoint(s) avg > 3s under load`);
  for (const c of consistencyChecks) {
    if (!c.passed) bugs.push(`FAILED: ${c.type}`);
  }

  console.log('\n🐛 BUGS FOUND');
  console.log('─'.repeat(50));
  if (bugs.length === 0) {
    console.log('  ✅ No critical bugs detected under 50-agent load!');
  } else {
    for (const b of bugs) console.log(`  🔴 ${b}`);
  }

  if (bugs.length > 0) {
    console.log('\n🔧 SUGGESTED FIXES');
    console.log('─'.repeat(50));
    if (status500Count > 0) {
      console.log('  • Check Vercel logs for failing routes');
      console.log('  • Missing model imports for .populate()');
      console.log('  • Increase MongoDB maxPoolSize');
    }
    if (emptyDataResponses > 0) {
      console.log('  • Empty responses = AbortController race or cold-start timeout');
      console.log('  • Increase serverless function timeout');
    }
    if (slow.length) {
      console.log('  • Add compound indexes on frequently queried fields');
      console.log('  • Cache aggregation results for analytics endpoints');
    }
  }

  console.log('\n' + '═'.repeat(70));
  console.log(`  Completed: ${new Date().toISOString()}`);
  console.log('═'.repeat(70) + '\n');
}

// ─── MAIN ────────────────────────────────────────────────────────
async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║        🚀 SaaS Load Test — 50 Concurrent Agents                ║');
  console.log(`║        Target: ${BASE_URL.padEnd(47)}║`);
  console.log('╚══════════════════════════════════════════════════════════════════╝');

  console.log('\n🔐 Authenticating against production...');
  const cookie = await getAuthCookie();
  console.log('  ✅ Session obtained');

  await testTenantIsolation(cookie);
  await testReadConsistency(cookie, 'pre-load');

  console.log(`\n🏁 Launching ${CONCURRENT_AGENTS} agents × ${CYCLES_PER_AGENT} cycles...`);
  const start = performance.now();
  await Promise.all(Array.from({ length: CONCURRENT_AGENTS }, (_, i) => runAgent(i, cookie)));
  console.log(`  ✅ All agents done in ${((performance.now() - start) / 1000).toFixed(1)}s`);

  await testReadConsistency(cookie, 'post-load');

  generateReport();
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
