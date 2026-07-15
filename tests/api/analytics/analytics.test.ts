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
  await client.login(TEST_CREDENTIALS.poolAdmin.email, TEST_CREDENTIALS.poolAdmin.password);

  await runner.run("Analytics API Tests", [
    { name: "GET /api/analytics/summary", fn: async () => { const res = await client.get("/api/analytics/summary"); await assertStatus(res, 200); } },
    { name: "GET /api/analytics/daily-members", fn: async () => { const res = await client.get("/api/analytics/daily-members"); await assertStatus(res, 200); } },
    { name: "GET /api/analytics/weekly-members", fn: async () => { const res = await client.get("/api/analytics/weekly-members"); await assertStatus(res, 200); } },
    { name: "GET /api/analytics/monthly-members", fn: async () => { const res = await client.get("/api/analytics/monthly-members"); await assertStatus(res, 200); } },
    { name: "GET /api/analytics/monthly-income", fn: async () => { const res = await client.get("/api/analytics/monthly-income"); await assertStatus(res, 200); } },
    { name: "GET /api/analytics/monthly-revenue", fn: async () => { const res = await client.get("/api/analytics/monthly-revenue"); await assertStatus(res, 200); } },
    { name: "GET /api/analytics/weekly-income", fn: async () => { const res = await client.get("/api/analytics/weekly-income"); await assertStatus(res, 200); } },
    { name: "GET /api/analytics/trends", fn: async () => { const res = await client.get("/api/analytics/trends"); await assertStatus(res, 200); } },
    { name: "GET /api/analytics/defaulters", fn: async () => { const res = await client.get("/api/analytics/defaulters"); await assertStatus(res, 200); } },
    { name: "GET /api/analytics/plan-revenue", fn: async () => { const res = await client.get("/api/analytics/plan-revenue"); await assertStatus(res, 200); } },
  ]);

  const summary = runner.summary();
  process.exit(summary.failed > 0 ? 1 : 0);
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
