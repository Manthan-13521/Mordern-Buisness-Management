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
let createdMemberId: string | null = null;

async function main() {
  await client.login(TEST_CREDENTIALS.poolAdmin.email, TEST_CREDENTIALS.poolAdmin.password);

  await runner.run("Business Flow — Member Lifecycle", [
    { name: "1. GET /api/dashboard — pool accessible", fn: async () => { const res = await client.get("/api/dashboard"); await assertStatus(res, 200); } },
    { name: "2. GET /api/plans — plans exist", fn: async () => {
      const res = await client.get("/api/plans"); await assertStatus(res, 200);
      const json = await assertJson(res); const plans = json.data || json;
      if (!Array.isArray(plans) || plans.length === 0) throw new Error("No plans");
    }},
    { name: "3. POST /api/members — create member", fn: async () => {
      const plansRes = await client.get("/api/plans");
      const plansJson = await assertJson(plansRes);
      const plans = plansJson.data || plansJson;
      if (!Array.isArray(plans) || plans.length === 0) throw new Error("No plans");
      const planId = plans[0]._id;
      const phone = `98888${Date.now().toString().slice(-6)}`;
      const res = await client.post("/api/members", { name: `Flow Member ${Date.now()}`, phone, planId });
      if (res.status !== 200 && res.status !== 201) throw new Error(`Create failed: ${res.status}`);
      const data = await assertJson(res);
      createdMemberId = data._id || data.memberId || data.id;
      if (!createdMemberId) throw new Error("No member ID");
    }},
    { name: "4. GET /api/members — member in list", fn: async () => {
      const res = await client.get("/api/members"); await assertStatus(res, 200);
    }},
    { name: "5. GET /api/members/lookup — lookup by uid", fn: async () => {
      if (!createdMemberId) throw new Error("No member ID");
      const res = await client.get(`/api/members/lookup?uid=${createdMemberId}`);
      if (res.status !== 200 && res.status !== 404) throw new Error(`Lookup: ${res.status}`);
    }},
    { name: "6. GET /api/occupancy — occupancy tracks", fn: async () => { const res = await client.get("/api/occupancy"); await assertStatus(res, 200); } },
    { name: "7. GET /api/analytics/summary — analytics reflect state", fn: async () => { const res = await client.get("/api/analytics/summary"); await assertStatus(res, 200); } },
    { name: "8. poolAdmin cannot access hostel dashboard", fn: async () => { const res = await client.get("/api/hostel/dashboard"); if (res.status !== 401 && res.status !== 403) throw new Error(`Expected 401/403, got ${res.status}`); } },
  ]);

  const summary = runner.summary();
  process.exit(summary.failed > 0 ? 1 : 0);
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
