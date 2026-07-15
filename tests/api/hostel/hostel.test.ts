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
  await client.login(TEST_CREDENTIALS.hostelAdmin.email, TEST_CREDENTIALS.hostelAdmin.password);

  await runner.run("Hostel API Tests", [
    { name: "GET /api/hostel/dashboard returns hostel data", fn: async () => { const res = await client.get("/api/hostel/dashboard"); await assertStatus(res, 200); } },
    { name: "GET /api/hostel/members returns paginated members", fn: async () => { const res = await client.get("/api/hostel/members"); await assertStatus(res, 200); } },
    { name: "GET /api/hostel/plans returns plan list", fn: async () => { const res = await client.get("/api/hostel/plans"); await assertStatus(res, 200); } },
    { name: "POST /api/hostel/plans creates a plan", fn: async () => { const res = await client.post("/api/hostel/plans", { name: `H Plan ${Date.now()}`, durationDays: 30, price: 500, features: ["bed"], isActive: true }); if (res.status !== 200 && res.status !== 201) throw new Error(`Failed: ${res.status}`); } },
    { name: "GET /api/hostel/rooms returns rooms", fn: async () => { const res = await client.get("/api/hostel/rooms"); await assertStatus(res, 200); } },
    { name: "GET /api/hostel/blocks returns blocks", fn: async () => { const res = await client.get("/api/hostel/blocks"); await assertStatus(res, 200); } },
    { name: "GET /api/hostel/structure returns structure", fn: async () => { const res = await client.get("/api/hostel/structure"); await assertStatus(res, 200); } },
    { name: "GET /api/hostel/payments returns payments", fn: async () => { const res = await client.get("/api/hostel/payments"); await assertStatus(res, 200); } },
    { name: "GET /api/hostel/settings returns settings", fn: async () => { const res = await client.get("/api/hostel/settings"); await assertStatus(res, 200); } },
    { name: "GET /api/hostel/staff returns staff list", fn: async () => { const res = await client.get("/api/hostel/staff"); await assertStatus(res, 200); } },
    { name: "GET /api/hostel/analytics/monthly-members", fn: async () => { const res = await client.get("/api/hostel/analytics/monthly-members"); await assertStatus(res, 200); } },
    { name: "GET /api/hostel/analytics/monthly-income", fn: async () => { const res = await client.get("/api/hostel/analytics/monthly-income"); await assertStatus(res, 200); } },
    { name: "GET /api/hostel/members/expired returns expired", fn: async () => { const res = await client.get("/api/hostel/members/expired"); await assertStatus(res, 200); } },
    { name: "GET /api/hostel/members/balance returns balance", fn: async () => { const res = await client.get("/api/hostel/members/balance"); await assertStatus(res, 200); } },
    { name: "GET /api/hostel/twilio/status returns Twilio config", fn: async () => { const res = await client.get("/api/hostel/twilio/status"); await assertStatus(res, 200); } },
  ]);

  const summary = runner.summary();
  process.exit(summary.failed > 0 ? 1 : 0);
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
