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
  await client.login(TEST_CREDENTIALS.poolAdmin.email, TEST_CREDENTIALS.poolAdmin.password);

  await runner.run("Analytics Extended Coverage", [
    // Monthly analytics
    { name: "GET /api/analytics/monthly-members returns 200", fn: async () => {
      const res = await client.get("/api/analytics/monthly-members");
      await assertStatus(res, 200);
    }},
    { name: "GET /api/analytics/monthly-income returns 200", fn: async () => {
      const res = await client.get("/api/analytics/monthly-income");
      await assertStatus(res, 200);
    }},
    { name: "GET /api/analytics/monthly-revenue returns 200", fn: async () => {
      const res = await client.get("/api/analytics/monthly-revenue");
      await assertStatus(res, 200);
    }},

    // Weekly analytics
    { name: "GET /api/analytics/weekly-members returns 200", fn: async () => {
      const res = await client.get("/api/analytics/weekly-members");
      await assertStatus(res, 200);
    }},
    { name: "GET /api/analytics/weekly-income returns 200", fn: async () => {
      const res = await client.get("/api/analytics/weekly-income");
      await assertStatus(res, 200);
    }},

    // Daily analytics
    { name: "GET /api/analytics/daily-members returns 200", fn: async () => {
      const res = await client.get("/api/analytics/daily-members");
      await assertStatus(res, 200);
    }},

    // Specialized analytics
    { name: "GET /api/analytics/defaulters returns 200", fn: async () => {
      const res = await client.get("/api/analytics/defaulters");
      await assertStatus(res, 200);
    }},
    { name: "GET /api/analytics/trends returns 200", fn: async () => {
      const res = await client.get("/api/analytics/trends");
      await assertStatus(res, 200);
    }},
    { name: "GET /api/analytics/summary returns 200", fn: async () => {
      const res = await client.get("/api/analytics/summary");
      await assertStatus(res, 200);
    }},
    { name: "GET /api/analytics/plan-revenue returns 200", fn: async () => {
      const res = await client.get("/api/analytics/plan-revenue");
      await assertStatus(res, 200);
    }},
  ]);

  const summary = runner.summary();
  process.exit(summary.failed > 0 ? 1 : 0);
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
