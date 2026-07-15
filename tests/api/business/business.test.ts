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
  await client.login(TEST_CREDENTIALS.businessAdmin.email, TEST_CREDENTIALS.businessAdmin.password);

  await runner.run("Business API Tests", [
    { name: "GET /api/business/info returns profile", fn: async () => { const res = await client.get("/api/business/info"); await assertStatus(res, 200); } },
    { name: "GET /api/business/analytics returns metrics", fn: async () => { const res = await client.get("/api/business/analytics"); await assertStatus(res, 200); } },
    { name: "GET /api/business/customers returns list", fn: async () => { const res = await client.get("/api/business/customers"); await assertStatus(res, 200); } },
    { name: "POST /api/business/customers creates customer", fn: async () => { const res = await client.post("/api/business/customers", { name: "Cust", phone: "9111111111" }); if (res.status !== 200 && res.status !== 201) throw new Error(`Failed: ${res.status}`); } },
    { name: "GET /api/business/sales returns list", fn: async () => { const res = await client.get("/api/business/sales"); await assertStatus(res, 200); } },
    { name: "GET /api/business/payments returns list", fn: async () => { const res = await client.get("/api/business/payments"); await assertStatus(res, 200); } },
    { name: "GET /api/business/stock returns inventory", fn: async () => { const res = await client.get("/api/business/stock"); await assertStatus(res, 200); } },
    { name: "POST /api/business/stock creates item", fn: async () => { const res = await client.post("/api/business/stock", { name: `Item ${Date.now()}`, currentQuantity: 10 }); if (res.status !== 200 && res.status !== 201) throw new Error(`Failed: ${res.status}`); } },
    { name: "GET /api/business/vehicles returns list", fn: async () => { const res = await client.get("/api/business/vehicles"); await assertStatus(res, 200); } },
    { name: "GET /api/business/labour returns list", fn: async () => { const res = await client.get("/api/business/labour"); await assertStatus(res, 200); } },
    { name: "POST /api/business/labour creates entry", fn: async () => { const res = await client.post("/api/business/labour", { name: "Worker", role: "General", salary: 500 }); if (res.status !== 200 && res.status !== 201) throw new Error(`Failed: ${res.status}`); } },
    { name: "GET /api/business/transactions returns ledger", fn: async () => { const res = await client.get("/api/business/transactions"); await assertStatus(res, 200); } },
    { name: "GET /api/business/attendance returns records", fn: async () => { const res = await client.get("/api/business/attendance"); await assertStatus(res, 200); } },
    { name: "GET /api/business/analytics/advanced returns insights", fn: async () => { const res = await client.get("/api/business/analytics/advanced"); await assertStatus(res, 200); } },
  ]);

  const summary = runner.summary();
  process.exit(summary.failed > 0 ? 1 : 0);
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
