/**
 * Comprehensive Functional Test Suite — AquaSync SaaS
 * Covers: Auth, Pool, Hostel, Business, Super Admin modules
 * 
 * Usage: npx tsx tests/comprehensive-functional-test.ts
 */

import 'dotenv/config';

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000';
const PASSWORD = 'testpass123';

interface TestResult {
  module: string;
  name: string;
  endpoint: string;
  method: string;
  status: number;
  expectedStatus: number;
  durationMs: number;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];
let passedCount = 0, failedCount = 0;

async function login(email: string, role: string): Promise<string> {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf-token`);
  const csrfData = await csrfRes.json() as any;
  const csrfToken = csrfData?.token || csrfData?.csrfToken || '';

  const formData = new URLSearchParams();
  formData.append('username', email);
  formData.append('password', PASSWORD);
  formData.append('json', 'true');
  if (role === 'admin' && email === 'admin@ts.com') formData.append('poolSlug', 'ts-pool');

  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString(),
    redirect: 'manual',
  });

  const cookies = (loginRes.headers.get('set-cookie') || '')
    .split(',').map(c => c.split(';')[0].trim()).filter(Boolean).join('; ');
  
  if (!cookies.includes('next-auth.session-token') && !cookies.includes('__Secure-next-auth.session-token')) {
    console.error(`Login failed for ${email}: status ${loginRes.status}`);
  }
  return cookies;
}

async function test(module: string, name: string, method: string, endpoint: string, cookie: string, expectedStatus: number, body?: any) {
  const start = Date.now();
  try {
    const opts: any = {
      method,
      headers: { 'Cookie': cookie, 'Content-Type': 'application/json' },
    };
    if (body && method !== 'GET') opts.body = JSON.stringify(body);
    if (endpoint.startsWith('http')) {
      // Full URL
    } else {
      // Prefix with BASE
    }

    const res = await fetch(endpoint.startsWith('http') ? endpoint : `${BASE}${endpoint}`, opts);
    const duration = Date.now() - start;
    let data: any;
    try { data = await res.json(); } catch { data = null; }

    const passed = res.status === expectedStatus || (expectedStatus === 200 && (res.status === 200 || res.status === 201));
    const result: TestResult = {
      module, name, endpoint: endpoint.replace(BASE, ''), method,
      status: res.status, expectedStatus, durationMs: duration, passed,
      error: data?.error || (passed ? undefined : `Expected ${expectedStatus}, got ${res.status}`),
    };
    results.push(result);
    if (passed) passedCount++; else failedCount++;
    
    const icon = passed ? '✅' : '❌';
    const statusStr = res.status === expectedStatus ? res.status.toString() : `${res.status} (expected ${expectedStatus})`;
    console.log(`  ${icon} [${duration}ms] ${method} ${endpoint.replace(BASE, '')} → ${statusStr}${data?.error ? ': ' + data.error : ''}`);
    
    return { status: res.status, data, duration };
  } catch (err: any) {
    const duration = Date.now() - start;
    results.push({
      module, name, endpoint: endpoint.replace(BASE, ''), method,
      status: 0, expectedStatus, durationMs: duration, passed: false,
      error: err.message,
    });
    failedCount++;
    console.log(`  ❌ [${duration}ms] ${method} ${endpoint.replace(BASE, '')} → NETWORK ERROR: ${err.message}`);
    return { status: 0, data: null, duration };
  }
}

async function testAuth() {
  console.log('\n━━━ AUTH MODULE ━━━');
  
  // T1: CSRF token
  await test('Auth', 'Get CSRF token', 'GET', '/api/auth/csrf-token', '', 200);
  
  // T2: Login success
  const cookie = await login('admin@ts.com', 'admin');
  console.log(`  Session cookie obtained: ${cookie ? '✅' : '❌'}`);
  return cookie;
}

async function testPoolModule(cookie: string) {
  console.log('\n━━━ POOL MODULE ━━━');
  
  // GET endpoints
  await test('Pool', 'List members', 'GET', '/api/members?page=1&limit=5', cookie, 200);
  await test('Pool', 'List payments', 'GET', '/api/payments?page=1&limit=5', cookie, 200);
  await test('Pool', 'List plans', 'GET', '/api/plans', cookie, 200);
  await test('Pool', 'Dashboard', 'GET', '/api/dashboard', cookie, 200);
  await test('Pool', 'Analytics summary', 'GET', '/api/analytics/summary', cookie, 200);
  await test('Pool', 'Monthly income', 'GET', '/api/analytics/monthly-income', cookie, 200);
  await test('Pool', 'Monthly members', 'GET', '/api/analytics/monthly-members', cookie, 200);
  await test('Pool', 'Defaulters', 'GET', '/api/analytics/defaulters', cookie, 200);
  await test('Pool', 'Occupancy', 'GET', '/api/occupancy', cookie, 200);
  await test('Pool', 'Entry logs', 'GET', '/api/entry', cookie, 200); // GET entry logs if supported
  await test('Pool', 'Backups list', 'GET', '/api/backups/list', cookie, 200);
  
  // Test plan creation/read/update/delete
  await test('Pool', 'Create plan', 'POST', '/api/plans', cookie, 201, {
    name: 'Test Plan Fn',
    price: 500,
    durationDays: 30,
    description: 'Functional test plan',
  });
  
  // Negative: Missing fields
  await test('Pool', 'Create plan (missing fields)', 'POST', '/api/plans', cookie, 400, {});
  
  // Negative: Unauthorized access
  await test('Pool', 'Access without auth', 'GET', '/api/members', '', 401);
  
  // Payment export
  await test('Pool', 'Export payments', 'GET', '/api/payments/export', cookie, 200);
}

async function testHostelModule(cookie: string) {
  console.log('\n━━━ HOSTEL MODULE ━━━');
  
  // GET endpoints
  await test('Hostel', 'Dashboard', 'GET', '/api/hostel/dashboard', cookie, 200);
  await test('Hostel', 'List members', 'GET', '/api/hostel/members?page=1&limit=5', cookie, 200);
  await test('Hostel', 'List payments', 'GET', '/api/hostel/payments?page=1&limit=5', cookie, 200);
  await test('Hostel', 'List plans', 'GET', '/api/hostel/plans', cookie, 200);
  await test('Hostel', 'Expired members', 'GET', '/api/hostel/members/expired?page=1&limit=5', cookie, 200);
  await test('Hostel', 'Balance members', 'GET', '/api/hostel/members/balance?page=1&limit=5', cookie, 200);
  await test('Hostel', 'List staff', 'GET', '/api/hostel/staff?page=1&limit=5', cookie, 200);
  await test('Hostel', 'List rooms', 'GET', '/api/hostel/rooms', cookie, 200);
  await test('Hostel', 'Structure', 'GET', '/api/hostel/structure', cookie, 200);
  await test('Hostel', 'Monthly income analytics', 'GET', '/api/hostel/analytics/monthly-income', cookie, 200);
  await test('Hostel', 'Monthly members analytics', 'GET', '/api/hostel/analytics/monthly-members', cookie, 200);
  
  // Negative: Invalid hostel member ID
  await test('Hostel', 'Get invalid member', 'GET', '/api/hostel/members/000000000000000000000000', cookie, 404);
}

async function testBusinessModule(cookie: string) {
  console.log('\n━━━ BUSINESS MODULE ━━━');
  
  // GET endpoints
  await test('Business', 'Analytics', 'GET', '/api/business/analytics', cookie, 200);
  await test('Business', 'List customers', 'GET', '/api/business/customers', cookie, 200);
  await test('Business', 'List transactions', 'GET', '/api/business/transactions', cookie, 200);
  await test('Business', 'List payments', 'GET', '/api/business/payments', cookie, 200);
  await test('Business', 'List sales', 'GET', '/api/business/sales', cookie, 200);
  await test('Business', 'List stock', 'GET', '/api/business/stock', cookie, 200);
  await test('Business', 'List labour', 'GET', '/api/business/labour', cookie, 200);
  await test('Business', 'List vehicles', 'GET', '/api/business/vehicles', cookie, 200);
  await test('Business', 'List attendance', 'GET', '/api/business/attendance', cookie, 200);
  await test('Business', 'Info', 'GET', '/api/business/info', cookie, 200);
  
  // Create a customer
  const custRes = await test('Business', 'Create customer', 'POST', '/api/business/customers', cookie, 201, {
    name: 'Test Customer',
    phone: '9999999999',
  });
  
  // Create a sale
  await test('Business', 'Create sale', 'POST', '/api/business/sales', cookie, 201, {
    customerName: 'Test Customer',
    items: [{ name: 'Item 1', quantity: 1, price: 100 }],
    totalAmount: 100,
  });
  
  // Record attendance
  await test('Business', 'Record attendance', 'POST', '/api/business/attendance', cookie, 201, {
    labourId: '000000000000000000000000',
    status: 'present',
    date: new Date().toISOString().split('T')[0],
  });
}

async function testSuperAdminModule(cookie: string) {
  console.log('\n━━━ SUPER ADMIN MODULE ━━━');
  
  await test('SuperAdmin', 'Dashboard', 'GET', '/api/superadmin/dashboard', cookie, 200);
  await test('SuperAdmin', 'Dashboard chart', 'GET', '/api/superadmin/dashboard/chart', cookie, 200);
  await test('SuperAdmin', 'List pools', 'GET', '/api/superadmin/pools', cookie, 200);
  await test('SuperAdmin', 'List hostels', 'GET', '/api/superadmin/hostels', cookie, 200);
  await test('SuperAdmin', 'List businesses', 'GET', '/api/superadmin/businesses', cookie, 200);
  await test('SuperAdmin', 'List referrals', 'GET', '/api/superadmin/referrals', cookie, 200);
  await test('SuperAdmin', 'List feedback', 'GET', '/api/superadmin/feedback', cookie, 200);
  await test('SuperAdmin', 'List ads', 'GET', '/api/superadmin/ads', cookie, 200);
}

async function testSecurity(cookie: string) {
  console.log('\n━━━ SECURITY TESTS ━━━');
  
  // Cross-tenant: Pool admin can't access hostel
  await test('Security', 'Cross-tenant hostel access', 'GET', '/api/hostel/dashboard', cookie, 401);
  
  // Missing CSRF on mutating endpoint (attempt POST without CSRF)
  // Note: CSRF is checked in middleware
  await test('Security', 'Rate limit check (health)', 'GET', '/api/metrics/health', cookie, 200);
  
  // Large payload
  const bigPayload = { name: 'x'.repeat(200000) };
  await test('Security', 'Large payload rejection', 'POST', '/api/members', cookie, 413, bigPayload);
}

async function testSubscriptionStates(cookie: string) {
  console.log('\n━━━ SUBSCRIPTION GUARD TESTS ━━━');
  
  // Test subscription-protected endpoint access
  await test('Subscription', 'Protected API access', 'GET', '/api/members', cookie, 200);
  
  // Test subscription status endpoint
  await test('Subscription', 'Subscription status', 'GET', '/api/subscription/status', cookie, 200);
}

function generateReport() {
  const passed = results.filter(r => r.passed);
  const failed = results.filter(r => !r.passed);
  
  const durations = passed.map(r => r.durationMs).sort((a, b) => a - b);
  const avg = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
  const p95 = durations[Math.floor(durations.length * 0.95)] || 0;
  const p99 = durations[Math.floor(durations.length * 0.99)] || 0;
  const max = durations[durations.length - 1] || 0;
  const totalTime = durations.reduce((a, b) => a + b, 0);
  
  // Module breakdown
  const modules = [...new Set(results.map(r => r.module))];
  
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║       🧪 FUNCTIONAL TEST RESULTS — AquaSync SaaS               ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  
  console.log(`\n📊 OVERALL: ${passed.length}/${results.length} passed (${(passed.length/results.length*100).toFixed(1)}%)`);
  console.log(`  Total Tests: ${results.length}`);
  console.log(`  Passed:      ${passed.length}`);
  console.log(`  Failed:      ${failed.length}`);
  console.log(`\n⚡ PERFORMANCE`);
  console.log(`  Average:     ${avg}ms`);
  console.log(`  P95:         ${p95}ms`);
  console.log(`  P99:         ${p99}ms`);
  console.log(`  Max:         ${max}ms`);
  console.log(`  Total Time:  ${totalTime}ms`);
  
  console.log(`\n📋 BY MODULE`);
  for (const mod of modules) {
    const modResults = results.filter(r => r.module === mod);
    const modPassed = modResults.filter(r => r.passed).length;
    const modFailed = modResults.filter(r => !r.passed).length;
    const modDurations = modResults.filter(r => r.passed).map(r => r.durationMs);
    const modAvg = modDurations.length ? Math.round(modDurations.reduce((a, b) => a + b, 0) / modDurations.length) : 0;
    console.log(`  ${mod}: ${modPassed}/${modResults.length} (avg ${modAvg}ms) ${modFailed > 0 ? '❌' : '✅'}`);
  }
  
  if (failed.length > 0) {
    console.log(`\n❌ FAILED TESTS`);
    for (const f of failed) {
      console.log(`  [${f.module}] ${f.name}: ${f.error}`);
    }
  }
  
  console.log(`\n${'═'.repeat(70)}`);
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║  AquaSync Comprehensive Functional Test Suite                   ║');
  console.log(`║  Target: ${BASE.padEnd(50)}║`);
  console.log(`║  Time:   ${new Date().toISOString().padEnd(50)}║`);
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  
  // 1. Auth tests
  const poolCookie = await testAuth();
  
  // 2. Pool module (with pool admin)
  await testPoolModule(poolCookie);
  
  // 3. Security tests
  await testSecurity(poolCookie);
  
  // 4. Hostel module (login as hostel admin)
  console.log('\n--- Logging in as Hostel Admin ---');
  const hostelCookie = await login('h@1.com', 'hostel_admin');
  await testHostelModule(hostelCookie);
  
  // 5. Business module (login as business admin)
  console.log('\n--- Logging in as Business Admin ---');
  const bizCookie = await login('b@1.com', 'business_admin');
  await testBusinessModule(bizCookie);
  
  // 6. Super admin module
  console.log('\n--- Logging in as Super Admin ---');
  const saCookie = await login('superadmin@tspools.com', 'superadmin');
  await testSuperAdminModule(saCookie);
  
  // 7. Subscription tests
  await testSubscriptionStates(poolCookie);
  
  // Report
  generateReport();
  
  process.exit(failedCount > 0 ? 1 : 0);
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
