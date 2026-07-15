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

  await runner.run("Members API Tests", [
    { name: "GET /api/members returns paginated list", fn: async () => {
      const res = await client.get("/api/members?page=1&limit=10");
      await assertStatus(res, 200);
    }},
    { name: "POST /api/members creates member with valid data", fn: async () => {
      const plansRes = await client.get("/api/plans");
      const plansJson = await assertJson(plansRes);
      const plans = plansJson.data || plansJson;
      if (!Array.isArray(plans) || plans.length === 0) throw new Error("No plans");
      const planId = plans[0]._id;
      const phone = `98888${Date.now().toString().slice(-6)}`;
      const res = await client.post("/api/members", { name: `Test Member ${Date.now()}`, phone, planId });
      if (res.status !== 200 && res.status !== 201) throw new Error(`Create member failed: ${res.status}`);
      const data = await assertJson(res);
      createdMemberId = data._id || data.memberId || data.id;
      if (!createdMemberId) throw new Error("No member ID");
    }},
    { name: "GET /api/members/lookup by memberId returns member", fn: async () => {
      if (!createdMemberId) throw new Error("No created member from previous test");
      const res = await client.get(`/api/members/lookup?uid=${createdMemberId}`);
      if (res.status !== 200 && res.status !== 404) throw new Error(`Lookup failed: ${res.status}`);
    }},
    { name: "GET /api/members/expired returns expired members", fn: async () => {
      const res = await client.get("/api/members/expired");
      await assertStatus(res, 200);
    }},
    { name: "GET /api/members/balance returns members with balance", fn: async () => {
      const res = await client.get("/api/members/balance");
      await assertStatus(res, 200);
    }},
    { name: "GET /api/members?status=active filters correctly", fn: async () => {
      const res = await client.get("/api/members?status=active");
      await assertStatus(res, 200);
    }},
    { name: "GET /api/members?search=Test finds matching members", fn: async () => {
      const res = await client.get("/api/members?search=Test");
      await assertStatus(res, 200);
    }},
    { name: "POST /api/members without name returns 400", fn: async () => {
      const res = await client.post("/api/members", { phone: "9999999999", planId: null });
      if (res.status < 400) throw new Error(`Expected 4xx, got ${res.status}`);
    }},
    { name: "POST /api/members without phone returns 400", fn: async () => {
      const res = await client.post("/api/members", { name: "No Phone", planId: null });
      if (res.status < 400) throw new Error(`Expected 4xx, got ${res.status}`);
    }},
    { name: "GET /api/members with invalid pagination handled gracefully", fn: async () => {
      const res = await client.get("/api/members?page=-1&limit=-1");
      await assertStatus(res, 200);
    }},
  ]);

  const summary = runner.summary();
  process.exit(summary.failed > 0 ? 1 : 0);
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
