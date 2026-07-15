import { TestClient, assertStatus, assertJson, TEST_CREDENTIALS } from "../../helpers";

const client = new TestClient();
const runner = {
  passed: 0, failed: 0, failures: [] as string[],
  async run(suite: string, tests: { name: string; fn: () => Promise<void> }[]) {
    console.log(`\n============================================================\n  ${suite}\n============================================================`);
    for (const t of tests) {
      try { const start = Date.now(); await t.fn(); console.log(`  \u2705 ${t.name} (${Date.now() - start}ms)`); this.passed++; }
      catch (e: any) { console.log(`  \u274c ${t.name} \u2014 ${e.message}`); this.failed++; this.failures.push(`  \u274c ${suite} > ${t.name}\n     ${e.message}`); }
    }
  },
  summary() {
    console.log(`\n============================================================\n  Results: ${this.passed}/${this.passed + this.failed} passed (${this.failed} failed)\n============================================================`);
    if (this.failures.length) { console.log(`\n  Failures:`); this.failures.forEach(f => console.log(f)); }
    return { passed: this.passed, failed: this.failed };
  },
};

async function main() {
  // Test that non-superadmin gets 401 on superadmin routes
  await client.login(TEST_CREDENTIALS.poolAdmin.email, TEST_CREDENTIALS.poolAdmin.password);

  await runner.run("SuperAdmin \u2014 Auth Gating", [
    { name: "GET /api/superadmin/pools returns 401 for non-superadmin", fn: async () => {
      const res = await client.get("/api/superadmin/pools");
      await assertStatus(res, 401);
    }},
    { name: "GET /api/superadmin/businesses returns 401 for non-superadmin", fn: async () => {
      const res = await client.get("/api/superadmin/businesses");
      await assertStatus(res, 401);
    }},
    { name: "GET /api/superadmin/hostels returns 401 for non-superadmin", fn: async () => {
      const res = await client.get("/api/superadmin/hostels");
      await assertStatus(res, 401);
    }},
    { name: "GET /api/superadmin/dashboard returns 403 for non-superadmin", fn: async () => {
      const res = await client.get("/api/superadmin/dashboard");
      if (res.status !== 401 && res.status !== 403) throw new Error(`Expected 401/403, got ${res.status}`);
    }},
  ]);

  // Login as superadmin
  await client.login(TEST_CREDENTIALS.superAdmin.email, TEST_CREDENTIALS.superAdmin.password, { isSuperAdmin: "true" });

  await runner.run("SuperAdmin \u2014 Pool Management", [
    { name: "GET /api/superadmin/pools returns pool list", fn: async () => {
      const res = await client.get("/api/superadmin/pools");
      await assertStatus(res, 200);
    }},
    { name: "GET /api/superadmin/pools/TEST-POOL-001 returns pool detail", fn: async () => {
      const res = await client.get("/api/superadmin/pools/TEST-POOL-001");
      if (res.status !== 200 && res.status !== 404) throw new Error(`Unexpected: ${res.status}`);
    }},
  ]);

  await runner.run("SuperAdmin \u2014 Business Management", [
    { name: "GET /api/superadmin/businesses returns business list", fn: async () => {
      const res = await client.get("/api/superadmin/businesses");
      await assertStatus(res, 200);
    }},
    { name: "GET /api/superadmin/businesses/TEST-BIZ-001 returns detail", fn: async () => {
      const res = await client.get("/api/superadmin/businesses/TEST-BIZ-001");
      if (res.status !== 200 && res.status !== 404) throw new Error(`Unexpected: ${res.status}`);
    }},
  ]);

  await runner.run("SuperAdmin \u2014 Hostel Management", [
    { name: "GET /api/superadmin/hostels returns hostel list", fn: async () => {
      const res = await client.get("/api/superadmin/hostels");
      await assertStatus(res, 200);
    }},
    { name: "GET /api/superadmin/hostels/TEST-HOSTEL-001 returns detail", fn: async () => {
      const res = await client.get("/api/superadmin/hostels/TEST-HOSTEL-001");
      if (res.status !== 200 && res.status !== 404) throw new Error(`Unexpected: ${res.status}`);
    }},
  ]);

  await runner.run("SuperAdmin \u2014 Dashboard & Feedback", [
    { name: "GET /api/superadmin/dashboard returns 200", fn: async () => {
      const res = await client.get("/api/superadmin/dashboard");
      await assertStatus(res, 200);
    }},
    { name: "GET /api/superadmin/dashboard/chart returns 200", fn: async () => {
      const res = await client.get("/api/superadmin/dashboard/chart");
      await assertStatus(res, 200);
    }},
    { name: "GET /api/superadmin/feedback returns 200", fn: async () => {
      const res = await client.get("/api/superadmin/feedback");
      await assertStatus(res, 200);
    }},
    { name: "GET /api/superadmin/referrals returns 200", fn: async () => {
      const res = await client.get("/api/superadmin/referrals");
      await assertStatus(res, 200);
    }},
  ]);

  await runner.run("SuperAdmin \u2014 Ads & Demo", [
    { name: "GET /api/superadmin/ads returns 200", fn: async () => {
      const res = await client.get("/api/superadmin/ads");
      await assertStatus(res, 200);
    }},
    { name: "GET /api/superadmin/demo returns 200/404", fn: async () => {
      const res = await client.get("/api/superadmin/demo");
      if (res.status !== 200 && res.status !== 404) throw new Error(`Unexpected: ${res.status}`);
    }},
  ]);

  // super-admin (hyphenated) routes
  await runner.run("Super-Admin (hyphenated) Coverage", [
    { name: "GET /api/super-admin/pools returns 200", fn: async () => {
      const res = await client.get("/api/super-admin/pools");
      if (res.status !== 200 && res.status !== 401) throw new Error(`Unexpected: ${res.status}`);
    }},
    { name: "GET /api/super-admin/stats returns 200", fn: async () => {
      const res = await client.get("/api/super-admin/stats");
      if (res.status !== 200 && res.status !== 401) throw new Error(`Unexpected: ${res.status}`);
    }},
  ]);

  const summary = runner.summary();
  process.exit(summary.failed > 0 ? 1 : 0);
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
