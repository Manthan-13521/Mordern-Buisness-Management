import { TestClient, assertStatus, assertJson, TEST_CREDENTIALS } from "../../helpers";

const runner = {
  passed: 0, failed: 0, failures: [] as string[],
  async run(suite: string, tests: { name: string; fn: () => Promise<void> }[]) {
    console.log(`\n============================================================\n  ${suite}\n============================================================`);
    for (const t of tests) {
      try { const start = Date.now(); await t.fn(); console.log(`  \u2705 ${t.name} (${Date.now() - start}ms)`); this.passed++; }
      catch (e: any) { console.log(`  \u274c ${t.name} — ${e.message}`); this.failed++; this.failures.push(`  \u274c ${suite} > ${t.name}\n     ${e.message}`); }
    }
  },
  summary() {
    console.log(`\n============================================================\n  Results: ${this.passed}/${this.passed + this.failed} passed (${this.failed} failed)\n============================================================`);
    if (this.failures.length) { console.log(`\n  Failures:`); this.failures.forEach(f => console.log(f)); }
    return { passed: this.passed, failed: this.failed };
  },
};

const client = new TestClient();

async function main() {
  await client.login(TEST_CREDENTIALS.superAdmin.email, TEST_CREDENTIALS.superAdmin.password, { isSuperAdmin: "true" });

  await runner.run("SuperAdmin API Tests", [
    { name: "GET /api/superadmin/dashboard returns stats", fn: async () => { const res = await client.get("/api/superadmin/dashboard"); await assertStatus(res, 200); } },
    { name: "GET /api/superadmin/dashboard/chart returns chart data", fn: async () => { const res = await client.get("/api/superadmin/dashboard/chart"); await assertStatus(res, 200); } },
    { name: "GET /api/superadmin/pools lists all pools", fn: async () => { const res = await client.get("/api/superadmin/pools"); await assertStatus(res, 200); } },
    { name: "GET /api/superadmin/hostels lists all hostels", fn: async () => { const res = await client.get("/api/superadmin/hostels"); await assertStatus(res, 200); } },
    { name: "GET /api/superadmin/businesses lists all businesses", fn: async () => { const res = await client.get("/api/superadmin/businesses"); await assertStatus(res, 200); } },
    { name: "GET /api/superadmin/feedback lists feedback", fn: async () => { const res = await client.get("/api/superadmin/feedback"); await assertStatus(res, 200); } },
    { name: "GET /api/superadmin/referrals lists referrals", fn: async () => { const res = await client.get("/api/superadmin/referrals"); await assertStatus(res, 200); } },
  ]);

  const summary = runner.summary();
  process.exit(summary.failed > 0 ? 1 : 0);
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
