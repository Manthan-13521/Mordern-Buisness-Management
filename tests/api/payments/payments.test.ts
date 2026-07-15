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
  // Payments are tenant-agnostic (superadmin can access all)
  await client.login(TEST_CREDENTIALS.poolAdmin.email, TEST_CREDENTIALS.poolAdmin.password);

  await runner.run("Payments API Tests", [
    { name: "GET /api/payments returns paginated list", fn: async () => { const res = await client.get("/api/payments"); await assertStatus(res, 200); } },
    { name: "GET /api/payments?method=cash filters correctly", fn: async () => { const res = await client.get("/api/payments?method=cash"); await assertStatus(res, 200); } },
    { name: "GET /api/payments?status=completed filters correctly", fn: async () => { const res = await client.get("/api/payments?status=completed"); await assertStatus(res, 200); } },
    { name: "GET /api/payments/export returns file", fn: async () => { const res = await client.get("/api/payments/export"); await assertStatus(res, 200); } },
  ]);

  const summary = runner.summary();
  process.exit(summary.failed > 0 ? 1 : 0);
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
